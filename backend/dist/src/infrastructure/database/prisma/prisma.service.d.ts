import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private shouldConnectOnStartup;
    private allowStartWithoutDb;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
