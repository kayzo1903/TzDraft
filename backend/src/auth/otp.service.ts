import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { BeamAfricaService } from '../infrastructure/sms/beam-africa.service';
import { normalizePhoneNumber } from '../shared/utils/phone.util';

/**
 * OTP Service
 * Handles OTP generation, storage, and verification
 */
@Injectable()
export class OtpService {
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
  ): Promise<{ success: boolean; message: string }> {
    const normalized = normalizePhoneNumber(phoneNumber);

    // Check if user already exists with this phone number
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber: normalized },
    });

    if (existingUser) {
      throw new BadRequestException(
        'User with this phone number already exists',
      );
    }

    // Generate OTP code
    const code = this.generateCode();

    // Store OTP in database
    await this.prisma.otpCode.create({
      data: {
        phoneNumber: normalized,
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
  async verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
    const normalized = normalizePhoneNumber(phoneNumber);

    // Find the most recent OTP for this phone number
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phoneNumber: normalized,
        code,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Check if OTP has expired
    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('OTP code has expired');
    }

    // Mark OTP as verified
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

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
