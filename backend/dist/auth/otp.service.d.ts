import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { BeamAfricaService } from '../infrastructure/sms/beam-africa.service';
import type { OtpPurpose } from './dto';
export declare class OtpService {
    private prisma;
    private beamAfrica;
    constructor(prisma: PrismaService, beamAfrica: BeamAfricaService);
    private generateCode;
    sendOTP(phoneNumber: string, purpose?: OtpPurpose): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyOTP(phoneNumber: string, code: string, _purpose?: OtpPurpose): Promise<boolean>;
    cleanupExpiredOTPs(): Promise<void>;
}
