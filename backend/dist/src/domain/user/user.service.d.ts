import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { User } from '@prisma/client';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findByPhoneNumber(phoneNumber: string): Promise<User | null>;
    findByIdentifier(identifier: string): Promise<User | null>;
    findById(id: string): Promise<({
        rating: {
            rating: number;
            gamesPlayed: number;
            lastUpdated: Date;
            userId: string;
        } | null;
    } & {
        id: string;
        phoneNumber: string;
        email: string | null;
        username: string;
        displayName: string;
        googleId: string | null;
        name: string | null;
        passwordHash: string | null;
        isVerified: boolean;
        country: string | null;
        region: string | null;
        createdAt: Date;
        lastLoginAt: Date | null;
        oauthProvider: string | null;
    }) | null>;
    create(data: {
        phoneNumber: string;
        email?: string;
        username: string;
        password: string;
        displayName?: string;
        country?: string;
        region?: string;
    }): Promise<User>;
}
