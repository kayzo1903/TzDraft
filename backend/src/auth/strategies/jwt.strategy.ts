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
    const user = await this.prisma.user.findUnique({
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

    if (!user) {
      throw new UnauthorizedException();
    }

    const hasRealPhoneNumber = user.phoneNumber.startsWith('+255');

    if (hasRealPhoneNumber && !user.isVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
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
