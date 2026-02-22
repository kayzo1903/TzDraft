import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    private resend;
    private readonly logger;
    constructor(configService: ConfigService);
    sendSupportEmail(from: string, subject: string, message: string): Promise<{
        data: import("resend").CreateEmailResponseSuccess;
        error: null;
    } & {
        headers: Record<string, string> | null;
    }>;
}
