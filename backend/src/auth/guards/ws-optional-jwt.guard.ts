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
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractToken(client);

      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: this.config.get('JWT_SECRET'),
        });

        // Attach user info to socket
        client.data.user = {
          id: payload.sub,
        };
      }

      return true;
    } catch (error) {
      // If token is invalid or missing, just return true (allow guest)
      return true;
    }
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
}
