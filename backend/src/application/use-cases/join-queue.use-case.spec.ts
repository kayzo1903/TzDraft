import { JoinQueueUseCase } from './join-queue.use-case';
import { GameStatus } from '../../shared/constants/game.constants';

// ─── Minimal Prisma fake ──────────────────────────────────────────────────────

type GameRow = {
  id: string;
  status: GameStatus;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
};

class FakePrismaService {
  private gameRows: GameRow[] = [];

  readonly game = {
    count: async ({
      where,
    }: {
      where: {
        status?: { in: GameStatus[] };
        OR?: [{ whitePlayerId: string }, { blackPlayerId: string }];
      };
    }): Promise<number> => {
      const statuses: GameStatus[] = where.status?.in ?? [];
      const a = where.OR?.[0]?.whitePlayerId;
      const b = where.OR?.[1]?.blackPlayerId;
      return this.gameRows.filter((g) => {
        const statusOk = statuses.includes(g.status);
        const playerOk = g.whitePlayerId === a || g.blackPlayerId === b;
        return statusOk && playerOk;
      }).length;
    },

    create: ({ data }: { data: any }) => {
      this.gameRows.push({
        id: data.id,
        status: data.status,
        whitePlayerId: data.whitePlayerId,
        blackPlayerId: data.blackPlayerId,
      });
      return Promise.resolve(data);
    },
  };

  getGames(): GameRow[] {
    return [...this.gameRows];
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JoinQueueUseCase', () => {
  describe('concurrency — only one worker can claim the same opponent', () => {
    it('does not match the same opponent into two games under concurrent joins', async () => {
      const prisma = new FakePrismaService();

      /**
       * Simulate the atomic claim: player A is waiting.
       * The first caller of findAndClaimMatch gets A; all subsequent callers get null.
       * A Lua script / Postgres $transaction provides this guarantee in production.
       */
      let claimed = false;
      const barrier = new Promise<void>((resolve) => setTimeout(resolve, 10));

      const matchmakingRepo = {
        removeStale: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
        upsert: jest.fn().mockResolvedValue({ userId: 'B', timeMs: 300000, socketId: 's', joinedAt: new Date(), rating: null, rd: null, volatility: null }),
        findOldestMatch: jest.fn().mockResolvedValue(null),
        findAndClaimMatch: jest.fn().mockImplementation(async () => {
          // Both workers reach here concurrently; wait so they truly overlap
          await barrier;
          if (!claimed) {
            claimed = true;
            return {
              id: 'A',
              userId: 'A',
              timeMs: 300000,
              socketId: 'socket-a',
              joinedAt: new Date(Date.now() - 5000),
              rating: 1200,
              rd: null,
              volatility: null,
            };
          }
          return null;
        }),
      };

      const useCase = new JoinQueueUseCase(matchmakingRepo as any, prisma as any);

      const [resB, resC] = await Promise.all([
        useCase.execute('B', 300000, 'socket-b', 1200),
        useCase.execute('C', 300000, 'socket-c', 1200),
      ]);

      const results = [resB, resC];
      const matched = results.filter((r) => r.status === 'matched');
      const waiting = results.filter((r) => r.status === 'waiting');

      expect(matched).toHaveLength(1);
      expect(waiting).toHaveLength(1);
      expect((matched[0] as any).opponentUserId).toBe('A');

      const games = prisma.getGames();
      expect(games).toHaveLength(1);

      const [game] = games;
      const players = [game.whitePlayerId, game.blackPlayerId];
      expect(players).toContain('A');
      // A is in exactly one colour slot
      expect(players.filter((p) => p === 'A')).toHaveLength(1);
    });
  });

  describe('normal flows', () => {
    let prisma: FakePrismaService;
    let matchmakingRepo: any;
    let useCase: JoinQueueUseCase;

    beforeEach(() => {
      prisma = new FakePrismaService();
      matchmakingRepo = {
        removeStale: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
        upsert: jest.fn().mockImplementation(async (e) => ({ ...e, id: e.userId, joinedAt: new Date() })),
        findOldestMatch: jest.fn().mockResolvedValue(null),
        findAndClaimMatch: jest.fn().mockResolvedValue(null),
      };
      useCase = new JoinQueueUseCase(matchmakingRepo, prisma as any);
    });

    it('returns waiting when no opponent is available', async () => {
      const result = await useCase.execute('user1', 300000, 'sock1', null);
      expect(result.status).toBe('waiting');
      expect(matchmakingRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user1', timeMs: 300000 }),
      );
    });

    it('creates a game when an opponent is found', async () => {
      matchmakingRepo.findAndClaimMatch.mockResolvedValue({
        id: 'opp',
        userId: 'opponent',
        timeMs: 300000,
        socketId: 'sock-opp',
        joinedAt: new Date(),
        rating: 1000,
        rd: null,
        volatility: null,
      });

      const result = await useCase.execute('user1', 300000, 'sock1', 1000);

      expect(result.status).toBe('matched');
      expect((result as any).opponentUserId).toBe('opponent');
      expect(prisma.getGames()).toHaveLength(1);
    });

    it('cancels queue for a user', async () => {
      await useCase.cancelQueue('user1');
      expect(matchmakingRepo.remove).toHaveBeenCalledWith('user1');
    });
  });
});
