// NestJS decorator mocks must come before any import that triggers them
jest.mock(
  '@nestjs/common',
  () => {
    const dec = () => () => undefined;
    return {
      Controller: dec,
      Post: dec,
      Get: dec,
      Patch: dec,
      Body: dec,
      Query: dec,
      UseGuards: dec,
      HttpCode: dec,
      Req: dec,
      Res: dec,
      Inject: dec,
      HttpStatus: { CREATED: 201, OK: 200, NO_CONTENT: 204 },
      UnauthorizedException: class UnauthorizedException extends Error {
        constructor(msg?: string) {
          super(msg);
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
jest.mock('./auth.service', () => ({ AuthService: class {} }));
jest.mock('./otp.service', () => ({ OtpService: class {} }));
jest.mock('./guards/google-oauth.guard', () => ({
  GoogleOAuthGuard: class {},
  GoogleMobileOAuthGuard: class {},
}));
jest.mock('./dto', () => ({}));
jest.mock('./decorators/public.decorator', () => ({
  Public: () => () => undefined,
}));
jest.mock('./decorators/current-user.decorator', () => ({
  CurrentUser: () => () => undefined,
}));
jest.mock('./guards/jwt-auth.guard', () => ({ JwtAuthGuard: class {} }));
jest.mock('../domain/user/user.service', () => ({ UserService: class {} }));

import { AuthController } from './auth.controller';

// ---------------------------------------------------------------------------

describe('AuthController — push token endpoints', () => {
  function makeController(
    userServiceOverrides: Partial<{
      savePushToken: jest.Mock;
      clearPushToken: jest.Mock;
    }> = {},
  ) {
    const userService = {
      savePushToken: jest.fn().mockResolvedValue(undefined),
      clearPushToken: jest.fn().mockResolvedValue(undefined),
      ...userServiceOverrides,
    };
    const controller = new AuthController(
      {} as any, // authService
      {} as any, // otpService
      userService as any,
      {} as any, // r2StorageService
    );
    return { controller, userService };
  }

  afterEach(() => jest.restoreAllMocks());

  // ── PATCH /auth/push-token ─────────────────────────────────────────────────

  describe('savePushToken', () => {
    it('calls userService.savePushToken with the user id and token', async () => {
      const { controller, userService } = makeController();

      await controller.savePushToken(
        { id: 'user-1' },
        'ExponentPushToken[abc]',
      );

      expect(userService.savePushToken).toHaveBeenCalledWith(
        'user-1',
        'ExponentPushToken[abc]',
      );
    });

    it('does not call savePushToken when token is an empty string', async () => {
      const { controller, userService } = makeController();

      await controller.savePushToken({ id: 'user-1' }, '');

      expect(userService.savePushToken).not.toHaveBeenCalled();
    });

    it('does not call savePushToken when token is undefined', async () => {
      const { controller, userService } = makeController();

      await controller.savePushToken({ id: 'user-1' }, undefined as any);

      expect(userService.savePushToken).not.toHaveBeenCalled();
    });

    it('returns undefined (204 No Content body)', async () => {
      const { controller } = makeController();

      const result = await controller.savePushToken(
        { id: 'user-1' },
        'ExponentPushToken[xyz]',
      );

      expect(result).toBeUndefined();
    });
  });

  // ── PATCH /auth/push-token/clear ───────────────────────────────────────────

  describe('clearPushToken', () => {
    it('calls userService.clearPushToken with the user id', async () => {
      const { controller, userService } = makeController();

      await controller.clearPushToken({ id: 'user-2' });

      expect(userService.clearPushToken).toHaveBeenCalledWith('user-2');
    });

    it('returns undefined (204 No Content body)', async () => {
      const { controller } = makeController();

      const result = await controller.clearPushToken({ id: 'user-2' });

      expect(result).toBeUndefined();
    });
  });
});
