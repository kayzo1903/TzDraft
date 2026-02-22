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
        createdAt: Date;
        name: string | null;
        phoneNumber: string;
        email: string | null;
        username: string;
        displayName: string;
        googleId: string | null;
        passwordHash: string | null;
        isVerified: boolean;
        country: string | null;
        region: string | null;
        lastLoginAt: Date | null;
        oauthProvider: string | null;
    }) | null>;
    findAll(): Promise<({
        rating: {
            rating: number;
            gamesPlayed: number;
            lastUpdated: Date;
            userId: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        name: string | null;
        phoneNumber: string;
        email: string | null;
        username: string;
        displayName: string;
        googleId: string | null;
        passwordHash: string | null;
        isVerified: boolean;
        country: string | null;
        region: string | null;
        lastLoginAt: Date | null;
        oauthProvider: string | null;
    })[]>;
    create(data: {
        phoneNumber: string;
        email?: string;
        username: string;
        password: string;
        displayName?: string;
        country?: string;
        region?: string;
    }): Promise<User>;
    updateRating(userId: string, newRating: number): Promise<void>;
}
