import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string }) {
    let user: {
      id: string;
      phoneNumber: string;
      email: string | null;
      username: string;
      displayName: string;
      isVerified: boolean;
      rating: { rating: number } | null;
    } | null = null;

    try {
      user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          phoneNumber: true,
          email: true,
          username: true,
          displayName: true,
          isVerified: true,
          rating: {
            select: {
              rating: true,
            },
          },
        },
      });
    } catch (error: any) {
      // If the DB is temporarily unreachable, treat as unauthorized rather than crashing the request pipeline.
      // PrismaService already retries transient failures; this is a final safety net.
      if (error?.code === 'P1001' || error?.code === 'P1002' || error?.code === 'P1017') {
        throw new UnauthorizedException('Authentication temporarily unavailable');
      }
      throw error;
    }

    if (!user) {
      throw new UnauthorizedException();
    }

    const hasRealPhoneNumber = user.phoneNumber.startsWith('+255');

    if (hasRealPhoneNumber && !user.isVerified) {
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true },
        });
      } catch {
        // Non-critical: don't block authentication if the verification flag can't be updated right now.
      }
    }

    return {
      id: user.id,
      phoneNumber: hasRealPhoneNumber ? user.phoneNumber : '',
      email: user.email ?? undefined,
      username: user.username,
      displayName: user.displayName,
      isVerified: hasRealPhoneNumber ? true : false,
      rating: user.rating?.rating ?? 1200,
    };
  }
}
