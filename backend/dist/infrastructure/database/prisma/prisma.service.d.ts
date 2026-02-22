import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private static instanceCount;
    private readonly retryMax;
    private readonly retryBaseDelayMs;
    constructor();
    private setupTransientRetry;
    private shouldConnectOnStartup;
    private allowStartWithoutDb;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
