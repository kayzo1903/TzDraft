import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import {
  RegisterDto,
  LoginDto,
  SendOtpDto,
  VerifyOtpDto,
  ResetPasswordPhoneDto,
} from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private otpService: OtpService,
  ) {}

  private getCookie(req: Request, name: string): string | undefined {
    const raw = req.headers.cookie;
    if (!raw) return undefined;

    const parts = raw.split(';');
    for (const part of parts) {
      const [key, ...rest] = part.trim().split('=');
      if (key === name) {
        return rest.join('=');
      }
    }

    return undefined;
  }

  private getCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN;

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOTP(dto.phoneNumber, dto.purpose);
  }

  @Public()
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
    const opts = this.getCookieOptions();
    res.cookie('accessToken', next.accessToken, opts);
    res.cookie('refreshToken', next.refreshToken, opts);

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

    const opts = this.getCookieOptions();
    res.clearCookie('accessToken', opts);
    res.clearCookie('refreshToken', opts);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@CurrentUser() user: any) {
    return user;
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/oauth-callback`;

    try {
      // Generate JWT tokens for the OAuth user.
      const { accessToken, refreshToken } =
        await this.authService.generateTokens(user.id);

      // Production-friendly: store tokens in httpOnly cookies and redirect to frontend.
      const opts = this.getCookieOptions();
      res.cookie('accessToken', accessToken, opts);
      res.cookie('refreshToken', refreshToken, opts);

      return res.redirect(redirectUrl);
    } catch {
      return res.redirect(`${frontendUrl}/auth/login?error=google_failed`);
    }
  }
}
