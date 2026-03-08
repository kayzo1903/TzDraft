import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AdminGuard implements CanActivate {
  private jwtGuard: JwtAuthGuard;

  constructor(private reflector: Reflector) {
    this.jwtGuard = new JwtAuthGuard(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await Promise.resolve(
      this.jwtGuard.canActivate(context),
    );

    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string };

    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access only');
    }

    return true;
  }
}
