jest.mock(
  '@nestjs/common',
  () => ({
    Injectable: () => () => undefined,
    UnauthorizedException: class UnauthorizedException extends Error {
      constructor(message?: string) {
        super(message);
        this.name = 'UnauthorizedException';
      }
    },
    ConflictException: class ConflictException extends Error {},
    BadRequestException: class BadRequestException extends Error {},
    NotFoundException: class NotFoundException extends Error {},
  }),
  { virtual: true },
);
jest.mock('@nestjs/jwt', () => ({ JwtService: class JwtService {} }), {
  virtual: true,
});
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }), {
  virtual: true,
});
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
jest.mock('./dto', () => ({}));
jest.mock('../infrastructure/database/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../domain/user/user.service', () => ({
  UserService: class UserService {},
}));
jest.mock('../shared/utils/phone.util', () => ({
  normalizePhoneNumber: (value: string) => value,
}));

import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rotates a refresh token only once under concurrent refresh attempts', async () => {
    const refreshToken = 'refresh-token';
    const liveTokens = new Set([refreshToken]);
    const createdTokens: Array<{
      userId: string;
      token: string;
      expiresAt: Date;
    }> = [];

    let deleteCalls = 0;
    let releaseDeletes: (() => void) | null = null;
    const deleteBarrier = new Promise<void>((resolve) => {
      releaseDeletes = resolve;
    });

    const deleteMany = jest.fn().mockImplementation(async ({ where }: any) => {
      deleteCalls += 1;
      if (deleteCalls === 2) {
        releaseDeletes?.();
      }
      await deleteBarrier;

      const tokenStillLive =
        liveTokens.has(where.token) &&
        where.userId === 'user-1' &&
        where.expiresAt?.gt instanceof Date;

      if (!tokenStillLive) {
        return { count: 0 };
      }

      liveTokens.delete(where.token);
      return { count: 1 };
    });

    const create = jest.fn().mockImplementation(async ({ data }: any) => {
      createdTokens.push(data);
      return data;
    });

    const prisma = {
      refreshToken: {
        create,
        deleteMany,
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) =>
        callback({
          refreshToken: {
            create,
            deleteMany,
          },
        }),
      ),
    };

    let accessCounter = 0;
    let refreshCounter = 0;
    const jwtService = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1', type: 'refresh' }),
      sign: jest.fn().mockImplementation((payload: any) => {
        if (payload.type === 'refresh') {
          refreshCounter += 1;
          return `new-refresh-${refreshCounter}`;
        }
        accessCounter += 1;
        return `new-access-${accessCounter}`;
      }),
    };
    const config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'jwt-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        return undefined;
      }),
    };

    const service = new AuthService(
      prisma as any,
      {} as any,
      jwtService as any,
      config as any,
    );

    const results = await Promise.allSettled([
      service.refreshTokens(refreshToken),
      service.refreshTokens(refreshToken),
    ]);

    const fulfilled = results.filter(
      (
        result,
      ): result is PromiseFulfilledResult<{
        accessToken: string;
        refreshToken: string;
      }> => result.status === 'fulfilled',
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(fulfilled[0].value).toEqual({
      accessToken: 'new-access-1',
      refreshToken: 'new-refresh-1',
    });
    expect(rejected[0].reason).toBeInstanceOf(UnauthorizedException);
    expect(deleteMany).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(1);
    expect(createdTokens).toEqual([
      expect.objectContaining({
        userId: 'user-1',
        token: 'new-refresh-1',
        expiresAt: expect.any(Date),
      }),
    ]);
  });

  it('rejects tokens that are not refresh tokens', async () => {
    const service = new AuthService(
      {
        refreshToken: {
          create: jest.fn(),
          deleteMany: jest.fn(),
        },
        $transaction: jest.fn(),
      } as any,
      {} as any,
      {
        verify: jest.fn().mockReturnValue({ sub: 'user-1', type: 'access' }),
        sign: jest.fn(),
      } as any,
      {
        get: jest.fn().mockReturnValue('secret'),
      } as any,
    );

    await expect(service.refreshTokens('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
