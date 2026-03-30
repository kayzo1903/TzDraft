import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { BeamAfricaService } from '../infrastructure/sms/beam-africa.service';
import { normalizePhoneNumber } from '../shared/utils/phone.util';
import type { OtpPurpose } from './dto';

/**
 * OTP Service
 * Handles OTP generation, storage, and verification
 */
@Injectable()
export class OtpService {
  private static readonly MAX_ATTEMPTS = 5;

  constructor(
    private prisma: PrismaService,
    private beamAfrica: BeamAfricaService,
  ) {}

  /**
   * Generate a 6-digit OTP code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to phone number
   * @param phoneNumber - Phone number (will be normalized)
   * @returns OTP code (for testing purposes)
   */
  async sendOTP(
    phoneNumber: string,
    purpose: OtpPurpose = 'signup',
  ): Promise<{ success: boolean; message: string }> {
    const normalized = normalizePhoneNumber(phoneNumber);

    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber: normalized },
    });

    // Use the same generic message for both cases to prevent phone enumeration.
    // signup rejects existing numbers; reset/verify rejects unknown numbers —
    // but we never reveal which condition triggered the error.
    if (purpose === 'signup' && existingUser) {
      throw new BadRequestException('Unable to send OTP. Please try again.');
    }

    if (
      (purpose === 'password_reset' || purpose === 'verify_phone') &&
      !existingUser
    ) {
      throw new BadRequestException('Unable to send OTP. Please try again.');
    }

    // Generate OTP code
    const code = this.generateCode();

    // Store OTP in database
    await this.prisma.otpCode.create({
      data: {
        phoneNumber: normalized,
        userId: existingUser?.id ?? null,
        purpose,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    // Send OTP via Beam Africa
    const sent = await this.beamAfrica.sendOTP(normalized, code);

    if (!sent) {
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  /**
   * Verify OTP code
   * @param phoneNumber - Phone number
   * @param code - OTP code to verify
   * @returns true if valid, throws error otherwise
   */
  async verifyOTP(
    phoneNumber: string,
    code: string,
    purpose: OtpPurpose = 'signup',
  ): Promise<boolean> {
    const normalized = normalizePhoneNumber(phoneNumber);

    // Find the most recent unverified OTP for this phone number and flow.
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phoneNumber: normalized,
        purpose,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generic error — never reveal whether the code is wrong vs. not found
    const invalidErr = new BadRequestException('Invalid or expired OTP code');

    if (!otpRecord) throw invalidErr;

    // Locked after too many failed attempts
    if (otpRecord.attempts >= OtpService.MAX_ATTEMPTS) {
      throw new BadRequestException('Too many failed attempts. Please request a new code.');
    }

    // Check expiry before comparing the code
    if (otpRecord.expiresAt < new Date()) throw invalidErr;

    // Wrong code — increment attempt counter
    if (otpRecord.code !== code) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw invalidErr;
    }

    // Correct — mark as verified
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // If the user exists for this phone number, consider the phone verified
    // and mark the user as verified.
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: normalized },
    });

    if (user && !user.isVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    return true;
  }

  /**
   * Clean up expired OTPs (can be run periodically)
   */
  async cleanupExpiredOTPs(): Promise<void> {
    await this.prisma.otpCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
