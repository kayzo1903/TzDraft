import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      // Attach user info to socket
      client.data.user = {
        id: payload.sub,
      };

      return true;
    } catch (error) {
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string | null {
    // 1. httpOnly cookie from the HTTP upgrade handshake (browser clients)
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }

    // 2. socket.io auth.token (fallback for non-browser / legacy clients)
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    // 3. Authorization header (fallback)
    const authHeader = client.handshake.headers.authorization;
    if (!authHeader) return null;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
