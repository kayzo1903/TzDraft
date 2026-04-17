import type { Request, Response } from 'express';

jest.mock(
  '@nestjs/common',
  () => {
    const decorator = () => () => undefined;
    return {
      Controller: decorator,
      Post: decorator,
      Get: decorator,
      Patch: decorator,
      Body: decorator,
      Query: decorator,
      UseGuards: decorator,
      HttpCode: decorator,
      Req: decorator,
      Res: decorator,
      HttpStatus: {
        CREATED: 201,
        OK: 200,
        NO_CONTENT: 204,
      },
      UnauthorizedException: class UnauthorizedException extends Error {
        constructor(message?: string) {
          super(message);
          this.name = 'UnauthorizedException';
        }
      },
    };
  },
  { virtual: true },
);
jest.mock('@nestjs/throttler', () => ({ Throttle: () => () => undefined }), {
  virtual: true,
});
jest.mock('@nestjs/passport', () => ({ AuthGuard: () => class {} }), {
  virtual: true,
});
jest.mock('./auth.service', () => ({ AuthService: class AuthService {} }));
jest.mock('./otp.service', () => ({ OtpService: class OtpService {} }));
jest.mock('./guards/google-oauth.guard', () => ({
  GoogleOAuthGuard: class GoogleOAuthGuard {},
}));
jest.mock('./dto', () => ({}));
jest.mock('./decorators/public.decorator', () => ({
  Public: () => () => undefined,
}));
jest.mock('./decorators/current-user.decorator', () => ({
  CurrentUser: () => () => undefined,
}));
jest.mock('./guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));
jest.mock('../domain/user/user.service', () => ({
  UserService: class UserService {},
}));

import { AuthController } from './auth.controller';

describe('AuthController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('refreshes using req.cookies and sets persistent auth cookies', async () => {
    const now = new Date('2026-04-10T12:00:00.000Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const authService = {
      refreshTokens: jest.fn().mockResolvedValue({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      }),
    };
    const controller = new AuthController(
      authService as any,
      {} as any,
      {} as any,
    );

    const req = {
      cookies: {
        refreshToken: 'cookie-refresh-token',
      },
    } as unknown as Request;
    const res = {
      cookie: jest.fn(),
    } as unknown as Response;

    const result = await controller.refresh(req, res, undefined);

    expect(authService.refreshTokens).toHaveBeenCalledWith(
      'cookie-refresh-token',
    );
    expect(result).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    expect((res.cookie as jest.Mock).mock.calls).toHaveLength(2);

    const [accessName, accessValue, accessOptions] = (res.cookie as jest.Mock)
      .mock.calls[0];
    expect(accessName).toBe('accessToken');
    expect(accessValue).toBe('access-1');
    expect(accessOptions).toEqual(
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: false,
        maxAge: 15 * 60 * 1000,
        expires: new Date(now + 15 * 60 * 1000),
      }),
    );

    const [refreshName, refreshValue, refreshOptions] = (
      res.cookie as jest.Mock
    ).mock.calls[1];
    expect(refreshName).toBe('refreshToken');
    expect(refreshValue).toBe('refresh-1');
    expect(refreshOptions).toEqual(
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        expires: new Date(now + 7 * 24 * 60 * 60 * 1000),
      }),
    );
  });
});
