import { ExpoPushService } from './expo-push.service';

// ---------------------------------------------------------------------------
// Minimal PrismaService mock — only the user model methods we touch
// ---------------------------------------------------------------------------

function makePrisma(userOverrides: Partial<{
  findUnique: jest.Mock;
  findMany: jest.Mock;
  updateMany: jest.Mock;
}> = {}) {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      ...userOverrides,
    },
  } as any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSvc(prisma: any): ExpoPushService {
  return new ExpoPushService(prisma);
}

function mockFetch(
  responseBody: object,
  status = 200,
): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
  } as unknown as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExpoPushService', () => {
  afterEach(() => jest.restoreAllMocks());

  // ── sendToUser ────────────────────────────────────────────────────────────

  describe('sendToUser', () => {
    it('does nothing when user has no push token', async () => {
      const prisma = makePrisma({
        findUnique: jest.fn().mockResolvedValue({ pushToken: null }),
      });
      const fetchSpy = mockFetch({ data: [] });
      const svc = makeSvc(prisma);

      await svc.sendToUser('user-1', 'Hello', 'Body');

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does nothing when user does not exist', async () => {
      const prisma = makePrisma({
        findUnique: jest.fn().mockResolvedValue(null),
      });
      const fetchSpy = mockFetch({ data: [] });
      const svc = makeSvc(prisma);

      await svc.sendToUser('ghost', 'Hello', 'Body');

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sends one push message when user has a token', async () => {
      const prisma = makePrisma({
        findUnique: jest.fn().mockResolvedValue({ pushToken: 'ExponentPushToken[abc]' }),
      });
      const fetchSpy = mockFetch({ data: [{ status: 'ok', id: 'ticket-1' }] });
      const svc = makeSvc(prisma);

      await svc.sendToUser('user-1', 'Match ready', 'Your turn', { matchId: 'm1' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://exp.host/--/api/v2/push/send');
      const body = JSON.parse(init.body as string);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        to: 'ExponentPushToken[abc]',
        title: 'Match ready',
        body: 'Your turn',
        data: { matchId: 'm1' },
        sound: 'default',
        priority: 'high',
      });
    });

    it('invalidates the DB token when Expo returns DeviceNotRegistered', async () => {
      const prisma = makePrisma({
        findUnique: jest.fn().mockResolvedValue({ pushToken: 'ExponentPushToken[stale]' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      });
      mockFetch({
        data: [
          {
            status: 'error',
            message: 'Invalid token',
            details: { error: 'DeviceNotRegistered' },
          },
        ],
      });
      const svc = makeSvc(prisma);

      await svc.sendToUser('user-1', 'Hello', 'Body');

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { pushToken: 'ExponentPushToken[stale]' },
        data: { pushToken: null },
      });
    });

    it('does not invalidate token for other Expo error types', async () => {
      const prisma = makePrisma({
        findUnique: jest.fn().mockResolvedValue({ pushToken: 'ExponentPushToken[ok]' }),
        updateMany: jest.fn(),
      });
      mockFetch({
        data: [
          { status: 'error', message: 'Rate limited', details: { error: 'MessageRateExceeded' } },
        ],
      });
      const svc = makeSvc(prisma);

      await svc.sendToUser('user-1', 'Hello', 'Body');

      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('swallows network errors without throwing', async () => {
      const prisma = makePrisma({
        findUnique: jest.fn().mockResolvedValue({ pushToken: 'ExponentPushToken[abc]' }),
      });
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
      const svc = makeSvc(prisma);

      await expect(svc.sendToUser('user-1', 'Hi', 'World')).resolves.toBeUndefined();
    });

    it('logs a warning on HTTP 4xx/5xx but does not throw', async () => {
      const prisma = makePrisma({
        findUnique: jest.fn().mockResolvedValue({ pushToken: 'ExponentPushToken[abc]' }),
      });
      mockFetch({}, 500);
      const svc = makeSvc(prisma);

      await expect(svc.sendToUser('user-1', 'Hi', 'World')).resolves.toBeUndefined();
    });
  });

  // ── sendToUsers ────────────────────────────────────────────────────────────

  describe('sendToUsers', () => {
    it('does nothing for an empty user-id list', async () => {
      const prisma = makePrisma({ findMany: jest.fn() });
      const fetchSpy = mockFetch({ data: [] });
      const svc = makeSvc(prisma);

      await svc.sendToUsers([], 'Hello', 'Body');

      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('skips users with null push token in the DB result', async () => {
      const prisma = makePrisma({
        findMany: jest.fn().mockResolvedValue([
          { pushToken: 'ExponentPushToken[a]' },
          { pushToken: null },
          { pushToken: 'ExponentPushToken[b]' },
        ]),
      });
      const fetchSpy = mockFetch({ data: [{ status: 'ok' }, { status: 'ok' }] });
      const svc = makeSvc(prisma);

      await svc.sendToUsers(['u1', 'u2', 'u3'], 'Title', 'Msg');

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body).toHaveLength(2);
      expect(body.map((m: any) => m.to)).toEqual([
        'ExponentPushToken[a]',
        'ExponentPushToken[b]',
      ]);
    });

    it('sends chunked requests when there are >100 tokens', async () => {
      const tokens = Array.from({ length: 150 }, (_, i) => ({
        pushToken: `ExponentPushToken[${i}]`,
      }));
      const prisma = makePrisma({ findMany: jest.fn().mockResolvedValue(tokens) });
      const fetchSpy = mockFetch({ data: Array(100).fill({ status: 'ok' }) });
      const svc = makeSvc(prisma);

      await svc.sendToUsers(Array.from({ length: 150 }, (_, i) => `u${i}`), 'T', 'B');

      // 150 tokens → 2 chunks (100 + 50)
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const first = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      const second = JSON.parse(fetchSpy.mock.calls[1][1].body as string);
      expect(first).toHaveLength(100);
      expect(second).toHaveLength(50);
    });

    it('queries the DB filtering pushToken: not null', async () => {
      const prisma = makePrisma({ findMany: jest.fn().mockResolvedValue([]) });
      mockFetch({ data: [] });
      const svc = makeSvc(prisma);

      await svc.sendToUsers(['u1', 'u2'], 'T', 'B');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ pushToken: { not: null } }),
        }),
      );
    });
  });
});
