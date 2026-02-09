import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { BeamAfricaService } from '../infrastructure/sms/beam-africa.service';
export declare class OtpService {
    private prisma;
    private beamAfrica;
    constructor(prisma: PrismaService, beamAfrica: BeamAfricaService);
    private generateCode;
    sendOTP(phoneNumber: string): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyOTP(phoneNumber: string, code: string): Promise<boolean>;
    cleanupExpiredOTPs(): Promise<void>;
}
