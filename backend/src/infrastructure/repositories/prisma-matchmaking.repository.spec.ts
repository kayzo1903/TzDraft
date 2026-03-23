import { PrismaMatchmakingRepository } from './prisma-matchmaking.repository';

describe('PrismaMatchmakingRepository', () => {
  it('only matches fresh queue entries from the last 60 seconds', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const prisma = {
      matchmakingQueue: {
        findFirst,
      },
      $transaction: async (callback: (tx: any) => Promise<any>) =>
        callback({
          matchmakingQueue: {
            findFirst,
            deleteMany: jest.fn(),
          },
        }),
    };

    const repository = new PrismaMatchmakingRepository(prisma as any);

    await repository.findOldestMatch(300000, 'user-1');
    await repository.findAndClaimMatch(300000, 'user-1', 1200);

    expect(findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          joinedAt: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
      }),
    );

    expect(findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          joinedAt: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
      }),
    );

    const firstCutoff = findFirst.mock.calls[0][0].where.joinedAt.gte as Date;
    const secondCutoff = findFirst.mock.calls[1][0].where.joinedAt.gte as Date;
    const now = Date.now();

    expect(now - firstCutoff.getTime()).toBeLessThanOrEqual(60_500);
    expect(now - secondCutoff.getTime()).toBeLessThanOrEqual(60_500);
  });
});
