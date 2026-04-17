import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { ExecutionContext } from '@nestjs/common';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const frontendUrl = process.env.FRONTEND_URL!;

    return {
      session: false,
      // If Google denies the request or client config is wrong, keep UX on the frontend.
      failureRedirect: `${frontendUrl}/auth/login?error=google_failed`,
    };
  }
}

/**
 * Separate guard for the mobile OAuth flow.
 * Uses a distinct callbackURL so we can register it in Google Console
 * independently from the web callback and redirect to a deep link on success.
 */
@Injectable()
export class GoogleMobileOAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    // Prefer explicit BACKEND_URL (always set in production).
    // In development, fall back to the incoming request's host so that a
    // physical device hitting 192.168.x.x:3002 gets a callback URL it can
    // actually reach — instead of localhost:3002 (which is the phone itself).
    const configured = (process.env.BACKEND_URL || '').replace(/\/$/, '');

    let backendUrl = configured;
    if (!backendUrl) {
      const req = context
        .switchToHttp()
        .getRequest<{ headers: Record<string, string> }>();
      const host =
        req.headers['host'] ?? `localhost:${process.env.PORT ?? '3002'}`;
      const proto = req.headers['x-forwarded-proto'] ?? 'http';
      backendUrl = `${proto}://${host}`;
    }

    return {
      session: false,
      callbackURL: `${backendUrl}/auth/google/mobile-callback`,
      failureRedirect: `tzdraft-mobile://auth/callback?error=google_failed`,
    };
  }
}
