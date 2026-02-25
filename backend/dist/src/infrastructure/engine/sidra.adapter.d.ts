import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEngineAdapter, EngineMove, EngineThinkRequest } from './engine-adapter.interface';
export declare class SidraAdapter implements IEngineAdapter, OnModuleInit, OnModuleDestroy {
    private readonly configService;
    readonly name = "SiDra";
    private readonly logger;
    private readonly defaultTimeLimitMs;
    private cliPath;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    dispose(): void;
    getBestMove(request: EngineThinkRequest): Promise<EngineMove | null>;
}
