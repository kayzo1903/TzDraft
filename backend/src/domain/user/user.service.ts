import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { normalizePhoneNumber } from '../../shared/utils/phone.util';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phoneNumber },
      include: { rating: true },
    });
  }

  /**
   * Find user by identifier (phone number or username)
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    // Check if identifier looks like a phone number
    const isPhone =
      identifier.startsWith('+') ||
      identifier.startsWith('0') ||
      /^\d+$/.test(identifier);

    if (isPhone) {
      // Normalize and search by phone
      const normalized = normalizePhoneNumber(identifier);

      return this.prisma.user.findFirst({
        where: { phoneNumber: normalized },
        include: { rating: true },
      });
    } else {
      // Search by username
      return this.prisma.user.findFirst({
        where: { username: identifier },
        include: { rating: true },
      });
    }
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        rating: true,
      },
    });
  }

  /**
   * Create a new user with automatic Rating initialization
   */
  async create(data: {
    phoneNumber: string;
    email?: string;
    username: string;
    password: string;
    displayName?: string;
    country?: string;
    region?: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phoneNumber: data.phoneNumber,
        email: data.email,
        username: data.username,
        passwordHash: hashedPassword,
        displayName: data.displayName || data.username,
        country: data.country || 'TZ',
        region: data.region,
        rating: {
          create: {
            rating: 1200,
            gamesPlayed: 0,
          },
        },
      },
      include: {
        rating: true,
      },
    });

    return user;
  }
}
