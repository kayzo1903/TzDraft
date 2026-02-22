import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsOptionalJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const guestId = this.extractGuestId(client);
    if (guestId) {
      client.data.guestId = guestId;
    }

    const token = this.extractToken(client);
    if (!token) {
      return true;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      // Attach authenticated user info to socket.
      client.data.user = {
        id: payload.sub,
      };
    } catch (error) {
      // If token is invalid, keep socket in guest mode.
    }

    return true;
  }

  private extractToken(client: Socket): string | null {
    const authToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : null;
    if (authToken) return authToken;

    const authHeader = client.handshake.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  private extractGuestId(client: Socket): string | null {
    const value = client.handshake.auth?.guestId;
    if (typeof value !== 'string') return null;
    const guestId = value.trim();
    if (!guestId || guestId.length > 100) return null;
    return guestId;
  }
}
