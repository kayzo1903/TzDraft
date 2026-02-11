import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { ExecutionContext } from '@nestjs/common';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return {
      session: false,
      // If Google denies the request or client config is wrong, keep UX on the frontend.
      failureRedirect: `${frontendUrl}/auth/login?error=google_failed`,
    };
  }
}
