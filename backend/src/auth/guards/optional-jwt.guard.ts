import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but never rejects unauthenticated requests.
 * Sets req.user to the decoded payload when a valid Bearer token is present,
 * or leaves it undefined when no token / invalid token is supplied.
 * Use on public endpoints that need optional caller identity.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest(_err: any, user: any) {
    return user ?? null;
  }
}
