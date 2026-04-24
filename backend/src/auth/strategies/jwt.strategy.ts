import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AccountType } from '@prisma/client';
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
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Primary: httpOnly cookie (XSS-safe)
        (req: any) => req?.cookies?.accessToken || null,
        // Fallback: Bearer token (mobile / non-browser clients)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: secret,
      passReqToCallback: false,
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
        role: true,
        isBanned: true,
        accountType: true,
        country: true,
        region: true,
        termsAcceptedAt: true,
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

    if (
      hasRealPhoneNumber &&
      (!user.isVerified || user.accountType !== AccountType.REGISTERED)
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          accountType: AccountType.REGISTERED,
        },
      });
    }

    return {
      id: user.id,
      phoneNumber:
        user.accountType === AccountType.REGISTERED ? user.phoneNumber : '',
      email:
        user.accountType === AccountType.GUEST
          ? undefined
          : (user.email ?? undefined),
      username: user.username,
      displayName: user.displayName,
      isVerified: user.accountType === AccountType.REGISTERED ? true : false,
      rating: user.rating?.rating ?? 1200,
      role: user.role,
      isBanned: user.isBanned,
      accountType: user.accountType,
      country: user.country,
      region: user.region,
      termsAcceptedAt: user.termsAcceptedAt ?? null,
    };
  }
}
