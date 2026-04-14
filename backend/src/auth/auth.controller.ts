import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { GoogleOAuthGuard, GoogleMobileOAuthGuard } from './guards/google-oauth.guard';
import {
  RegisterDto,
  LoginDto,
  SendOtpDto,
  VerifyOtpDto,
  ResetPasswordPhoneDto,
  UpdateProfileDto,
} from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserService } from '../domain/user/user.service';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private otpService: OtpService,
    private userService: UserService,
  ) {}

  private getCookie(req: Request, name: string): string | undefined {
    return (req as any).cookies?.[name];
  }

  private getCookieBaseOptions(): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN;

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };
  }

  private getAccessTokenCookieOptions(): CookieOptions {
    return {
      ...this.getCookieBaseOptions(),
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
      expires: new Date(Date.now() + ACCESS_TOKEN_MAX_AGE_MS),
    };
  }

  private getRefreshTokenCookieOptions(): CookieOptions {
    return {
      ...this.getCookieBaseOptions(),
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
      expires: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
    };
  }

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    res.cookie(
      'accessToken',
      tokens.accessToken,
      this.getAccessTokenCookieOptions(),
    );
    res.cookie(
      'refreshToken',
      tokens.refreshToken,
      this.getRefreshTokenCookieOptions(),
    );
  }

  private clearAuthCookies(res: Response): void {
    const opts = this.getCookieBaseOptions();
    res.clearCookie('accessToken', opts);
    res.clearCookie('refreshToken', opts);
  }

  @Public()
  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  async createGuest(@Res({ passthrough: true }) res: Response) {
    const result = await this.authService.createGuestUser();
    this.setAuthCookies(res, result);
    return result;
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result);
    return result;
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result);
    return result;
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOTP(dto.phoneNumber, dto.purpose);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.otpService.verifyOTP(dto.phoneNumber, dto.code, dto.purpose);
    return { success: true, message: 'Phone number verified successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') refreshToken?: string,
  ) {
    const tokenFromCookie = this.getCookie(req, 'refreshToken');
    const token = refreshToken || tokenFromCookie;

    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const next = await this.authService.refreshTokens(token);

    // Smooth OAuth flow: allow refresh via httpOnly cookie (cross-subdomain).
    // Also set access token cookie so cookie-auth can work without localStorage if desired.
    this.setAuthCookies(res, next);

    return next;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: any,
    @Body('refreshToken') refreshToken: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokenFromCookie = this.getCookie(req, 'refreshToken');
    const token = refreshToken || tokenFromCookie;
    if (token) {
      await this.authService.logout(user.id, token);
    }

    this.clearAuthCookies(res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    this.authService.touchLastLogin(user.id);
    return user;
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @Public()
  @Post('reset-password-phone')
  async resetPasswordPhone(@Body() dto: ResetPasswordPhoneDto) {
    return this.authService.resetPasswordPhone(
      dto.phoneNumber,
      dto.code,
      dto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('rank')
  async getMyRank(@CurrentUser() user: any) {
    const rank = await this.userService.getPlayerRank(user.id);
    return { success: true, data: rank };
  }

  @Public()
  @Get('leaderboard')
  async getLeaderboard(
    @Query('skip') skip = '0',
    @Query('take') take = '50',
    @Query('country') country?: string,
    @Query('region') region?: string,
  ) {
    const data = await this.userService.getLeaderboard({
      skip: parseInt(skip, 10),
      take: Math.min(parseInt(take, 10), 100),
      country,
      region,
    });
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    const updated = await this.userService.updateProfile(user.id, dto);
    return { success: true, data: updated };
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthCallback(@CurrentUser() user: any, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL!;
    const redirectUrl = `${frontendUrl}/sw/auth/oauth-callback`;

    try {
      // Generate JWT tokens for the OAuth user.
      const { accessToken, refreshToken } =
        await this.authService.generateTokens(user.id);

      // Production-friendly: store tokens in httpOnly cookies and redirect to frontend.
      this.setAuthCookies(res, { accessToken, refreshToken });

      return res.redirect(redirectUrl);
    } catch {
      return res.redirect(
        `${process.env.FRONTEND_URL!}/sw/auth/login?error=google_failed`,
      );
    }
  }

  // ─── Mobile Google OAuth ────────────────────────────────────────────────────
  // Uses a separate callbackURL (/auth/google/mobile-callback) so that it can
  // be registered independently in Google Console and redirect to the app's
  // deep-link scheme instead of the web frontend URL.

  @Public()
  @Get('google/mobile')
  @UseGuards(GoogleMobileOAuthGuard)
  async googleMobileAuth() {
    // Passport redirects to Google — nothing to do here.
  }

  @Public()
  @Get('google/mobile-callback')
  @UseGuards(GoogleMobileOAuthGuard)
  async googleMobileCallback(@CurrentUser() user: any, @Res() res: Response) {
    try {
      const { accessToken, refreshToken } =
        await this.authService.generateTokens(user.id);

      // Redirect to the app's deep-link scheme — openAuthSessionAsync intercepts this.
      return res.redirect(
        `tzdraft-mobile://auth/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`,
      );
    } catch {
      return res.redirect(`tzdraft-mobile://auth/callback?error=google_failed`);
    }
  }
}
