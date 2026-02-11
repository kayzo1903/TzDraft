import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { UserService } from '../domain/user/user.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { normalizePhoneNumber } from '../shared/utils/phone.util';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

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
        verified: true,
        expiresAt: { gt: new Date() },
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
    await this.prisma.otpCode.delete({
      where: { id: verifiedOtp.id },
    });

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
    if (hasRealPhoneNumber && !user.isVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
      isVerified = true;
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
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // Generate new tokens
    return this.generateTokens(tokenRecord.userId);
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

    await this.prisma.verificationToken.delete({
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
    const resetToken = crypto.randomBytes(32).toString('hex');
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

    await this.prisma.passwordResetToken.delete({
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
    await this.prisma.otpCode.delete({
      where: { id: otpRecord.id },
    });

    return { message: 'Password reset successfully' };
  }

  async validateOAuthUser(profile: {
    googleId: string;
    email: string;
    name: string;
    oauthProvider: string;
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
          data: { isVerified: false },
          include: { rating: true },
        });
      }

      // User exists, update googleId if not already set
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            oauthProvider: profile.oauthProvider,
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
        phoneNumber: `oauth_${profile.googleId}`, // Placeholder since phoneNumber is required
        isVerified: false,
        passwordHash: null,
        rating: {
          create: {
            rating: 500,
          },
        },
      },
      include: { rating: true },
    });

    return user;
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
      const suffix = crypto.randomBytes(2).toString('hex');
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

  async generateTokens(
    userId: string,
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
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { accessToken, refreshToken };
  }
}
