/* eslint-disable @typescript-eslint/unbound-method */
// jest.setup.js globally mocks tournament-notification.service — unmock it
// so we test the real implementation here.
jest.unmock('./tournament-notification.service');

import { TournamentNotificationService } from './tournament-notification.service';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
import { NotificationType } from '../../domain/notification/notification.entity';

// ---------------------------------------------------------------------------
// Module-level mocks (must come before any imports that use them)
// ---------------------------------------------------------------------------

jest.mock('../../infrastructure/messaging/games.gateway');
jest.mock('../../infrastructure/database/prisma/prisma.service');
jest.mock('../../infrastructure/email/email.service');
jest.mock('../../infrastructure/sms/beam-africa.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNotifRepo() {
  return {
    create: jest.fn().mockImplementation(async (n: any) => n),
    findByUserId: jest.fn().mockResolvedValue([]),
    countUnread: jest.fn().mockResolvedValue(0),
    markRead: jest.fn().mockResolvedValue(undefined),
    markAllRead: jest.fn().mockResolvedValue(undefined),
  };
}

function makeEmailService() {
  return {
    sendTournamentRegistered: jest.fn().mockResolvedValue(undefined),
    sendTournamentStarted: jest.fn().mockResolvedValue(undefined),
    sendMatchAssigned: jest.fn().mockResolvedValue(undefined),
    sendMatchResult: jest.fn().mockResolvedValue(undefined),
    sendTournamentCompleted: jest.fn().mockResolvedValue(undefined),
  };
}

function makeSmsService() {
  return { sendTournamentAlert: jest.fn().mockResolvedValue(undefined) };
}

function makeExpoPush() {
  return {
    sendToUser: jest.fn().mockResolvedValue(undefined),
    sendToUsers: jest.fn().mockResolvedValue(undefined),
  };
}

function makePrisma(users: any[]) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(users[0] ?? null),
      findMany: jest.fn().mockResolvedValue(users),
    },
  } as any;
}

function makeTournament(overrides: Partial<any> = {}): any {
  return {
    id: 'tourn-1',
    name: 'Summer Cup',
    scheduledStartAt: new Date('2026-05-01T10:00:00Z'),
    format: 'SINGLE_ELIMINATION',
    style: 'STANDARD',
    ...overrides,
  };
}

function makeMatch(overrides: Partial<any> = {}): any {
  return { id: 'match-1', ...overrides };
}

function makeSvc(
  overrides: {
    users?: any[];
    notifRepo?: any;
    email?: any;
    sms?: any;
    expoPush?: any;
  } = {},
): {
  svc: TournamentNotificationService;
  gateway: GamesGateway;
  expoPush: ReturnType<typeof makeExpoPush>;
  notifRepo: ReturnType<typeof makeNotifRepo>;
} {
  const users = overrides.users ?? [
    {
      id: 'u1',
      email: 'a@b.com',
      phoneNumber: '+255700000001',
      displayName: 'Alice',
    },
  ];
  const notifRepo = overrides.notifRepo ?? makeNotifRepo();
  const gateway = new GamesGateway({} as any);
  const email = overrides.email ?? makeEmailService();
  const sms = overrides.sms ?? makeSmsService();
  const expoPush = overrides.expoPush ?? makeExpoPush();
  const prisma = makePrisma(users);

  const svc = new TournamentNotificationService(
    notifRepo,
    gateway,
    email,
    sms,
    prisma,
    expoPush,
  );
  return { svc, gateway, expoPush, notifRepo };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TournamentNotificationService', () => {
  afterEach(() => jest.clearAllMocks());

  // ── notifyRegistered ──────────────────────────────────────────────────────

  describe('notifyRegistered', () => {
    it('persists, emits WS, and sends push', async () => {
      const { svc, gateway, expoPush, notifRepo } = makeSvc();

      await svc.notifyRegistered('u1', makeTournament());

      expect(notifRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          type: NotificationType.TOURNAMENT_REGISTERED,
        }),
      );
      expect(gateway.emitNotification).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          type: NotificationType.TOURNAMENT_REGISTERED,
        }),
      );
      expect(expoPush.sendToUser).toHaveBeenCalledWith(
        'u1',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          tournamentId: 'tourn-1',
          screen: 'tournament',
        }),
      );
    });

    it('still sends push even when DB persist throws', async () => {
      const badRepo = {
        ...makeNotifRepo(),
        create: jest.fn().mockRejectedValue(new Error('DB down')),
      };
      const { svc, expoPush } = makeSvc({ notifRepo: badRepo });

      await svc.notifyRegistered('u1', makeTournament());

      expect(expoPush.sendToUser).toHaveBeenCalledTimes(1);
    });
  });

  // ── notifyTournamentStarted ───────────────────────────────────────────────

  describe('notifyTournamentStarted', () => {
    it('sends WS + push to every participant', async () => {
      const users = [
        {
          id: 'u1',
          email: 'a@b.com',
          phoneNumber: '+255700000001',
          displayName: 'Alice',
        },
        {
          id: 'u2',
          email: 'b@c.com',
          phoneNumber: '+255700000002',
          displayName: 'Bob',
        },
      ];
      const { svc, gateway, expoPush } = makeSvc({ users });

      await svc.notifyTournamentStarted(['u1', 'u2'], makeTournament(), 4);

      expect(gateway.emitNotification).toHaveBeenCalledTimes(2);
      expect(expoPush.sendToUser).toHaveBeenCalledTimes(2);
      expect(expoPush.sendToUser).toHaveBeenCalledWith(
        'u1',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ tournamentId: 'tourn-1' }),
      );
    });
  });

  // ── notifyMatchAssigned ───────────────────────────────────────────────────

  describe('notifyMatchAssigned', () => {
    it('notifies both players with opponent name in title', async () => {
      const users = [
        {
          id: 'p1',
          email: 'p1@t.com',
          phoneNumber: '+255700000001',
          displayName: 'Alice',
        },
        {
          id: 'p2',
          email: 'p2@t.com',
          phoneNumber: '+255700000002',
          displayName: 'Bob',
        },
      ];
      const { svc, gateway, expoPush } = makeSvc({ users });

      await svc.notifyMatchAssigned(
        'p1',
        'p2',
        makeMatch(),
        makeTournament(),
        1,
      );

      expect(gateway.emitNotification).toHaveBeenCalledTimes(2);
      expect(expoPush.sendToUser).toHaveBeenCalledTimes(2);

      // Alice's notification mentions Bob
      const [, aliceTitle] = expoPush.sendToUser.mock.calls.find(
        ([uid]: [string]) => uid === 'p1',
      );
      expect(aliceTitle).toMatch(/Bob/);

      // Bob's notification mentions Alice
      const [, bobTitle] = expoPush.sendToUser.mock.calls.find(
        ([uid]: [string]) => uid === 'p2',
      );
      expect(bobTitle).toMatch(/Alice/);
    });

    it('sends push with matchId and tournamentId in data', async () => {
      const users = [
        {
          id: 'p1',
          email: null,
          phoneNumber: '+255700000001',
          displayName: 'Alice',
        },
        {
          id: 'p2',
          email: null,
          phoneNumber: '+255700000002',
          displayName: 'Bob',
        },
      ];
      const { svc, expoPush } = makeSvc({ users });

      await svc.notifyMatchAssigned(
        'p1',
        'p2',
        makeMatch({ id: 'match-99' }),
        makeTournament(),
        2,
      );

      const callData = expoPush.sendToUser.mock.calls.map(
        ([, , , data]: [string, string, string, any]) => data,
      );
      for (const d of callData) {
        expect(d).toMatchObject({
          matchId: 'match-99',
          tournamentId: 'tourn-1',
          screen: 'tournament',
        });
      }
    });

    it('does nothing if either player is missing from the DB', async () => {
      const { svc, gateway, expoPush } = makeSvc({
        users: [
          { id: 'p1', email: null, phoneNumber: '+1', displayName: 'Alice' },
        ],
      });

      // p2 not found
      await svc.notifyMatchAssigned(
        'p1',
        'p2',
        makeMatch(),
        makeTournament(),
        1,
      );

      expect(gateway.emitNotification).not.toHaveBeenCalled();
      expect(expoPush.sendToUser).not.toHaveBeenCalled();
    });
  });

  // ── notifyMatchResult ─────────────────────────────────────────────────────

  describe('notifyMatchResult', () => {
    it('emits MATCH_RESULT for winner and ELIMINATED for loser', async () => {
      const users = [
        { id: 'winner', email: 'w@t.com', displayName: 'Alice' },
        { id: 'loser', email: 'l@t.com', displayName: 'Bob' },
      ];
      const { svc, notifRepo, expoPush } = makeSvc({ users });

      await svc.notifyMatchResult(
        'winner',
        'loser',
        makeMatch(),
        makeTournament(),
        '2-0',
        1,
      );

      const createdTypes = notifRepo.create.mock.calls.map(
        (args) => args[0].type,
      );
      expect(createdTypes).toContain(NotificationType.MATCH_RESULT);
      expect(createdTypes).toContain(NotificationType.ELIMINATED);
      expect(expoPush.sendToUser).toHaveBeenCalledTimes(2);
    });

    it('handles null winner/loser gracefully', async () => {
      const { svc, expoPush } = makeSvc({ users: [] });

      await svc.notifyMatchResult(
        null,
        null,
        makeMatch(),
        makeTournament(),
        '0-0',
        1,
      );

      expect(expoPush.sendToUser).not.toHaveBeenCalled();
    });
  });

  // ── notifyTournamentCompleted ─────────────────────────────────────────────

  describe('notifyTournamentCompleted', () => {
    it('marks the champion with a unique title', async () => {
      const users = [
        { id: 'champ', email: 'c@t.com', displayName: 'Champ' },
        { id: 'runner', email: 'r@t.com', displayName: 'Runner' },
      ];
      const { svc, notifRepo } = makeSvc({ users });

      await svc.notifyTournamentCompleted(
        ['champ', 'runner'],
        'champ',
        makeTournament(),
      );

      // Each call is [notificationInstance], extract the first arg
      const created: any[] = notifRepo.create.mock.calls.map((args) => args[0]);
      const champNotif = created.find((n) => n.userId === 'champ');
      const runnerNotif = created.find((n) => n.userId === 'runner');

      expect(champNotif.title).toMatch(/won/i);
      expect(runnerNotif.title).not.toMatch(/won/i);
    });

    it('sends push to all participants', async () => {
      const users = Array.from({ length: 3 }, (_, i) => ({
        id: `u${i}`,
        email: null,
        displayName: `Player${i}`,
      }));
      const { svc, expoPush } = makeSvc({ users });

      await svc.notifyTournamentCompleted(
        ['u0', 'u1', 'u2'],
        'u0',
        makeTournament(),
      );

      expect(expoPush.sendToUser).toHaveBeenCalledTimes(3);
    });
  });

  // ── notifyTournamentCancelled ─────────────────────────────────────────────

  describe('notifyTournamentCancelled', () => {
    it('persists TOURNAMENT_CANCELLED + emits WS + push for each participant', async () => {
      const users = [
        {
          id: 'u1',
          email: null,
          phoneNumber: '+255700000001',
          displayName: 'Alice',
        },
        {
          id: 'u2',
          email: null,
          phoneNumber: '+255700000002',
          displayName: 'Bob',
        },
      ];
      const { svc, gateway, expoPush, notifRepo } = makeSvc({ users });

      await svc.notifyTournamentCancelled(['u1', 'u2'], makeTournament());

      expect(notifRepo.create).toHaveBeenCalledTimes(2);
      expect(gateway.emitNotification).toHaveBeenCalledTimes(2);
      expect(expoPush.sendToUser).toHaveBeenCalledTimes(2);
    });
  });
});
