import { JoinQueueUseCase } from './join-queue.use-case';
import { GameStatus } from '../../shared/constants/game.constants';

type QueueRow = {
  id: string;
  userId: string;
  timeMs: number;
  socketId: string;
  joinedAt: Date;
  rating: number | null;
  rd: number | null;
  volatility: number | null;
};

type GameRow = {
  id: string;
  status: GameStatus;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
};

class FakePrismaService {
  private queueRows: QueueRow[] = [];
  private gameRows: GameRow[] = [];
  private queueIdCounter = 0;
  private findBarrierCount = 0;
  private findBarrierTarget = 2;
  private findBarrierResolve: (() => void) | null = null;
  private findBarrierPromise: Promise<void>;

  constructor() {
    this.findBarrierPromise = new Promise<void>((resolve) => {
      this.findBarrierResolve = resolve;
    });
  }

  seedQueue(userId: string, timeMs: number, joinedAt: Date): void {
    this.queueRows.push({
      id: `q${++this.queueIdCounter}`,
      userId,
      timeMs,
      socketId: `${userId}-socket`,
      joinedAt,
      rating: null,
      rd: null,
      volatility: null,
    });
  }

  getGames(): GameRow[] {
    return [...this.gameRows];
  }

  getQueue(): QueueRow[] {
    return [...this.queueRows];
  }

  async $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return fn({
      matchmakingQueue: {
        deleteMany: async ({ where }: { where: any }) => {
          const before = this.queueRows.length;
          this.queueRows = this.queueRows.filter((row) => {
            if (where.joinedAt?.lt) {
              return !(row.joinedAt < where.joinedAt.lt);
            }
            if (where.userId) {
              return row.userId !== where.userId;
            }
            if (where.id) {
              return row.id !== where.id;
            }
            return true;
          });
          return { count: before - this.queueRows.length };
        },
        findFirst: async ({ where }: { where: any }) => {
          const candidates = this.queueRows
            .filter(
              (row) =>
                row.timeMs === where.timeMs &&
                row.userId !== where.userId?.not,
            )
            .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

          const oldest = candidates[0] ?? null;
          if (oldest) {
            this.findBarrierCount += 1;
            if (this.findBarrierCount === this.findBarrierTarget) {
              this.findBarrierResolve?.();
            }
            await this.findBarrierPromise;
          }
          return oldest;
        },
        upsert: async ({ where, update, create }: { where: any; update: any; create: any }) => {
          const existing = this.queueRows.find((row) => row.userId === where.userId);
          if (existing) {
            existing.timeMs = update.timeMs;
            existing.socketId = update.socketId;
            existing.joinedAt = update.joinedAt;
            existing.rating = update.rating ?? null;
            existing.rd = update.rd ?? null;
            existing.volatility = update.volatility ?? null;
            return existing;
          }

          const created: QueueRow = {
            id: `q${++this.queueIdCounter}`,
            userId: create.userId,
            timeMs: create.timeMs,
            socketId: create.socketId,
            joinedAt: new Date(),
            rating: create.rating ?? null,
            rd: create.rd ?? null,
            volatility: create.volatility ?? null,
          };
          this.queueRows.push(created);
          return created;
        },
      },
      game: {
        count: async ({ where }: { where: any }) => {
          const statuses: GameStatus[] = where.status?.in ?? [];
          const a = where.OR?.[0]?.whitePlayerId;
          const b = where.OR?.[1]?.blackPlayerId;
          return this.gameRows.filter((g) => {
            const statusOk = statuses.includes(g.status);
            const playerOk = g.whitePlayerId === a || g.blackPlayerId === b;
            return statusOk && playerOk;
          }).length;
        },
        create: async ({ data }: { data: any }) => {
          this.gameRows.push({
            id: data.id,
            status: data.status,
            whitePlayerId: data.whitePlayerId,
            blackPlayerId: data.blackPlayerId,
          });
          return data;
        },
      },
    });
  }
}

describe('JoinQueueUseCase concurrency', () => {
  it('does not match the same opponent into two games under concurrent joins', async () => {
    const prisma = new FakePrismaService();
    const matchmakingRepo = {
      upsert: jest.fn(),
      remove: jest.fn(),
      removeStale: jest.fn(),
      findOldestMatch: jest.fn(),
    };

    // Existing waiting player A.
    prisma.seedQueue('A', 300000, new Date(Date.now() - 5000));

    const useCase = new JoinQueueUseCase(
      matchmakingRepo as any,
      prisma as any,
    );

    const [resB, resC] = await Promise.all([
      useCase.execute('B', 300000, 'socket-b', 1200),
      useCase.execute('C', 300000, 'socket-c', 1200),
    ]);

    const matched = [resB, resC].filter((r) => r.status === 'matched');
    const waiting = [resB, resC].filter((r) => r.status === 'waiting');

    expect(matched).toHaveLength(1);
    expect(waiting).toHaveLength(1);
    expect((matched[0] as any).opponentUserId).toBe('A');

    const games = prisma.getGames();
    expect(games).toHaveLength(1);

    const [game] = games;
    const players = [game.whitePlayerId, game.blackPlayerId];
    expect(players).toContain('A');
    expect(players.filter((p) => p === 'A')).toHaveLength(1);
  });
});
