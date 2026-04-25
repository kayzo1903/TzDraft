import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AccountType, Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { UserService } from '../domain/user/user.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { normalizePhoneNumber } from '../shared/utils/phone.util';
import { randomUUID, randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get('GOOGLE_CLIENT_ID'));
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Validate password confirmation
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Normalize phone number
    const phoneNumber = normalizePhoneNumber(dto.phoneNumber);

    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { username: dto.username },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this phone number, username, or email already exists',
      );
    }

    // Ensure phone number was verified via OTP before creating account
    const verifiedOtp = await this.prisma.otpCode.findFirst({
      where: {
        phoneNumber,
        purpose: 'signup',
        verified: true,
        createdAt: {
          gt: new Date(Date.now() - 15 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verifiedOtp) {
      throw new BadRequestException(
        'Phone number must be verified before creating an account',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user with rating relation
    const user = await this.prisma.user.create({
      data: {
        phoneNumber,
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName || dto.username,
        passwordHash: hashedPassword,
        isVerified: true,
        accountType: AccountType.REGISTERED,
        country: dto.country,
        region: dto.region,
        rating: {
          create: {
            rating: 500,
          },
        },
      },
      include: {
        rating: true,
      },
    });

    // Delete OTP to prevent reuse
    await this.prisma.otpCode.deleteMany({
      where: { id: verifiedOtp.id },
    });

    // Send welcome notification
    await this.createWelcomeNotification(user.id);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email ?? undefined,
        username: user.username,
        displayName: user.displayName,
        isVerified: user.isVerified,
        rating: user.rating?.rating || 1200,
        country: user.country ?? undefined,
        region: user.region ?? undefined,
        role: user.role,
        isBanned: user.isBanned,
        accountType: user.accountType,
        avatarUrl: (user as any).avatarUrl ?? undefined,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user by identifier (phone or username) with rating relation
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: normalizePhoneNumber(dto.identifier) },
          { username: dto.identifier },
        ],
      },
      include: {
        rating: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is OAuth-only (no password)
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Google Sign-In. Please sign in with Google.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Policy: accounts that authenticate with a real phone number are treated as verified.
    // OAuth placeholder phone numbers (e.g. "oauth_*") are treated as having no phone and are not verified.
    const hasRealPhoneNumber = user.phoneNumber.startsWith('+255');
    let isVerified = user.isVerified;
    let accountType = user.accountType;
    if (
      hasRealPhoneNumber &&
      (!user.isVerified || user.accountType !== AccountType.REGISTERED)
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, accountType: AccountType.REGISTERED },
      });
      isVerified = true;
      accountType = AccountType.REGISTERED;
    } else if (
      !hasRealPhoneNumber &&
      user.oauthProvider &&
      user.accountType !== AccountType.OAUTH_PENDING
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { accountType: AccountType.OAUTH_PENDING, isVerified: false },
      });
      isVerified = false;
      accountType = AccountType.OAUTH_PENDING;
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        phoneNumber: hasRealPhoneNumber ? user.phoneNumber : '',
        email: user.email ?? undefined,
        username: user.username,
        displayName: user.displayName,
        isVerified: hasRealPhoneNumber ? true : false,
        rating: user.rating?.rating || 1200,
        country: user.country ?? undefined,
        region: user.region ?? undefined,
        role: user.role,
        isBanned: user.isBanned,
        accountType,
        avatarUrl: (user as any).avatarUrl ?? undefined,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub?: string; type?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Rotate the refresh token atomically so only one concurrent refresh wins.
        const deleted = await tx.refreshToken.deleteMany({
          where: {
            token: refreshToken,
            userId: payload.sub!,
            expiresAt: { gt: new Date() },
          },
        });

        if (deleted.count !== 1) {
          throw new UnauthorizedException('Invalid refresh token');
        }

        return this.generateTokens(payload.sub!, tx);
      },
      {
        maxWait: 15000, // Wait up to 15s to get a connection
        timeout: 20000, // Allow up to 20s to finish the rotation
      },
    );
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: { isVerified: true },
    });

    await this.prisma.verificationToken.deleteMany({
      where: { id: verificationToken.id },
    });

    return { message: 'Email verified successfully' };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return {
        message:
          'If an account with that email exists, a password reset link has been sent',
      };
    }

    // Delete any existing reset tokens
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send password reset email
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    return {
      message:
        'If an account with that email exists, a password reset link has been sent',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    await this.prisma.passwordResetToken.deleteMany({
      where: { id: resetToken.id },
    });

    return { message: 'Password reset successfully' };
  }

  async resetPasswordPhone(
    phoneNumber: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const normalized = normalizePhoneNumber(phoneNumber);

    // 1. Find verified OTP created within last 15 mins
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phoneNumber: normalized,
        purpose: 'password_reset',
        code,
        verified: true,
        createdAt: {
          gt: new Date(Date.now() - 15 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'Invalid or expired OTP verification. Please verify your phone number again.',
      );
    }

    // 2. Find user
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: normalized },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 3. Update password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // 4. Delete OTP to prevent reuse
    await this.prisma.otpCode.deleteMany({
      where: { id: otpRecord.id },
    });

    return { message: 'Password reset successfully' };
  }

  async validateOAuthUser(profile: {
    googleId: string;
    email: string;
    name: string;
    oauthProvider: string;
    avatarUrl?: string;
  }): Promise<any> {
    // Check if user exists by email
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: { rating: true },
    });

    if (user) {
      // Ensure non-real-phone OAuth accounts are never treated as verified.
      if (!user.phoneNumber.startsWith('+255') && user.isVerified) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            isVerified: false,
            accountType: AccountType.OAUTH_PENDING,
            ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
          },
          include: { rating: true },
        });
      } else {
        // Just update avatar if needed
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            oauthProvider: profile.oauthProvider,
            ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
          },
          include: { rating: true },
        });
      }
      return user;
    }

    // User doesn't exist, create new user
    const username = await this.generateUniqueUsername(profile.email);
    const displayName = await this.generateUniqueDisplayName(profile.name);

    user = await this.prisma.user.create({
      data: {
        email: profile.email,
        username,
        name: profile.name,
        displayName,
        googleId: profile.googleId,
        oauthProvider: profile.oauthProvider,
        avatarUrl: profile.avatarUrl,
        phoneNumber: `oauth_${profile.googleId}`, // Placeholder since phoneNumber is required
        isVerified: false,
        accountType: AccountType.OAUTH_PENDING,
        passwordHash: null,
        rating: {
          create: {
            rating: 500,
          },
        },
      },
      include: { rating: true },
    });

    // Send welcome notification for new OAuth users
    await this.createWelcomeNotification(user.id);

    return user;
  }

  async verifyGoogleNativeToken(idToken: string): Promise<AuthResponseDto> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: [
          this.config.get('GOOGLE_CLIENT_ID'),
          this.config.get('GOOGLE_ANDROID_CLIENT_ID'),
        ].filter(Boolean),
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      const user = await this.validateOAuthUser({
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name!,
        oauthProvider: 'google',
        avatarUrl: payload.picture,
      });

      const { accessToken, refreshToken } = await this.generateTokens(user.id);

      return {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber.startsWith('oauth_')
            ? ''
            : user.phoneNumber,
          email: user.email ?? undefined,
          username: user.username,
          displayName: user.displayName,
          isVerified: user.isVerified,
          rating: user.rating?.rating || 1200,
          country: user.country ?? undefined,
          region: user.region ?? undefined,
          role: user.role,
          isBanned: user.isBanned,
          accountType: user.accountType,
          avatarUrl: user.avatarUrl ?? undefined,
        },
        accessToken,
        refreshToken,
      };
    } catch (error: any) {
      this.logger.error(`Google token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    // Extract base from email and sanitize
    const baseUsername = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    let username = baseUsername;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const exists = await this.prisma.user.findUnique({
        where: { username },
      });

      if (!exists) {
        return username;
      }

      // Add random suffix
      const suffix = randomBytes(2).toString('hex');
      username = `${baseUsername}_${suffix}`;
      attempts++;
    }

    throw new Error('Could not generate unique username');
  }

  private async generateUniqueDisplayName(name: string): Promise<string> {
    // Sanitize name to create base (e.g., "John Smith" → "JohnSmith")
    const baseName = name.replace(/\s+/g, '');

    let displayName = baseName;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const exists = await this.prisma.user.findUnique({
        where: { displayName },
      });

      if (!exists) {
        return displayName;
      }

      // Add numeric suffix
      attempts++;
      displayName = `${baseName}${attempts + 1}`;
    }

    throw new Error('Could not generate unique display name');
  }

  /**
   * Create a temporary guest account for invite-link joins (no registration required)
   */
  async createGuestUser(): Promise<AuthResponseDto> {
    const suffix = randomBytes(4).toString('hex').toUpperCase(); // 8 chars
    const username = `Guest_${suffix}`;
    const displayName = username;
    const phoneNumber = `GUEST_${crypto.randomUUID().replace(/-/g, '')}`;

    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        phoneNumber,
        username,
        displayName,
        isVerified: false,
        accountType: AccountType.GUEST,
        lastLoginAt: now,
        rating: { create: { rating: 1200 } },
      },
      include: { rating: true },
    });

    // Send welcome notification for new guest users
    await this.createWelcomeNotification(user.id);

    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        username: user.username,
        displayName: user.displayName,
        isVerified: user.isVerified,
        rating: user.rating?.rating || 1200,
        role: user.role,
        isBanned: user.isBanned,
        accountType: user.accountType,
        avatarUrl: (user as any).avatarUrl ?? undefined,
      },
      accessToken,
      refreshToken,
    };
  }

  async generateTokens(
    userId: string,
    db: PrismaClientLike = this.prisma,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Generate access token (short-lived)
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    // Generate refresh token (long-lived)
    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    // Store refresh token
    await db.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Create welcome notification for new users
   */
  private async createWelcomeNotification(userId: string): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: 'WELCOME',
          title: 'Welcome to TzDraft!',
          body: 'Cheza Drafti mtandaoni na wapezaji wa Tanzania. Jiunge na ligi, pambana na AI, au mualike rafiki!',
          metadata: {
            bodyEn:
              'Play Drafti online with players from Tanzania. Join leagues, compete against AI, or invite friends!',
          },
          read: false,
          createdAt: new Date(),
        },
      });
    } catch (err) {
      // Non-fatal — don't block registration
      this.logger.warn(`Failed to create welcome notification: ${err}`);
    }
  }

  async acceptTerms(userId: string): Promise<{ termsAcceptedAt: Date }> {
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { termsAcceptedAt: now },
    });
    return { termsAcceptedAt: now };
  }

  /**
   * Bump last_login_at for visit analytics.
   * Called on GET /auth/me (every page load) — fire-and-forget so it never
   * slows down the response. Only updates once per hour to avoid thrashing.
   */
  touchLastLogin(userId: string): void {
    // No await — intentionally fire-and-forget
    this.prisma.user
      .updateMany({
        where: {
          id: userId,
          OR: [
            { lastLoginAt: null },
            { lastLoginAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
          ],
        },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => {
        // Non-fatal — analytics is best-effort
      });
  }
}
