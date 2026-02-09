import { ConfigService } from '@nestjs/config';
export declare class BeamAfricaService {
    private config;
    private readonly logger;
    private readonly apiKey;
    private readonly secretKey;
    private readonly senderId;
    private readonly baseUrl;
    constructor(config: ConfigService);
    sendOTP(phoneNumber: string, code: string): Promise<boolean>;
    getBalance(): Promise<number | null>;
}
