"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = class PrismaService extends client_1.PrismaClient {
    static { PrismaService_1 = this; }
    logger = new common_1.Logger(PrismaService_1.name);
    static instanceCount = 0;
    retryMax = Number(process.env.PRISMA_RETRY_MAX ?? 2);
    retryBaseDelayMs = Number(process.env.PRISMA_RETRY_BASE_DELAY_MS ?? 150);
    constructor() {
        PrismaService_1.instanceCount++;
        const url = process.env.DATABASE_URL;
        super({
            datasources: {
                db: {
                    url,
                },
            },
            log: ['info', 'warn', 'error'],
        });
        this.logger.warn(`PrismaService instantiated. Count: ${PrismaService_1.instanceCount}`);
        this.setupTransientRetry();
        if (!url) {
            this.logger.error('DATABASE_URL is not defined in process.env in constructor');
        }
        else {
            this.logger.log(`Initialized PrismaClient with URL length: ${url.length}`);
        }
    }
    setupTransientRetry() {
        const maxRetries = Number.isFinite(this.retryMax)
            ? Math.max(0, Math.floor(this.retryMax))
            : 0;
        const baseDelayMs = Number.isFinite(this.retryBaseDelayMs)
            ? Math.max(0, Math.floor(this.retryBaseDelayMs))
            : 0;
        if (maxRetries === 0)
            return;
        this.$use(async (params, next) => {
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    return await next(params);
                }
                catch (error) {
                    const code = error?.code;
                    const isTransient = code === 'P1001' ||
                        code === 'P1002' ||
                        code === 'P1017';
                    if (!isTransient || attempt >= maxRetries) {
                        throw error;
                    }
                    const delayMs = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
                    this.logger.warn(`Prisma transient error ${code ?? '(unknown)'} on ${params.model ?? 'raw'}.${params.action}. ` +
                        `Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries}).`);
                    try {
                        await this.$connect();
                    }
                    catch (connectError) {
                        this.logger.warn(`Prisma reconnect attempt failed: ${connectError instanceof Error
                            ? connectError.message
                            : String(connectError)}`);
                    }
                    if (delayMs > 0) {
                        await new Promise((resolve) => setTimeout(resolve, delayMs));
                    }
                }
            }
            throw new Error('Prisma retry middleware fell through unexpectedly');
        });
    }
    shouldConnectOnStartup() {
        const raw = (process.env.DB_CONNECT_ON_STARTUP ?? 'true').toLowerCase();
        return raw !== 'false' && raw !== '0' && raw !== 'no';
    }
    allowStartWithoutDb() {
        const raw = (process.env.ALLOW_START_WITHOUT_DB ?? 'false').toLowerCase();
        return raw === 'true' || raw === '1' || raw === 'yes';
    }
    async onModuleInit() {
        if (!this.shouldConnectOnStartup()) {
            this.logger.warn('Skipping database connect on startup (DB_CONNECT_ON_STARTUP=false)');
            return;
        }
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            const message = 'DATABASE_URL is not set';
            if (this.allowStartWithoutDb()) {
                this.logger.error(message);
                this.logger.warn('Continuing without a database connection (ALLOW_START_WITHOUT_DB=true)');
                return;
            }
            throw new Error(message);
        }
        try {
            if (!databaseUrl) {
                this.logger.error('CRITICAL: DATABASE_URL is undefined/empty');
            }
            else {
                this.logger.log(`Raw DATABASE_URL length: ${databaseUrl.length}`);
                const safeUrl = databaseUrl.replace(/:[^:]*@/, ':***@');
                this.logger.log(`Connection string: ${safeUrl}`);
            }
            const parsed = new URL(databaseUrl);
            const dbName = (parsed.pathname || '').replace(/^\//, '') || '(default)';
            const user = parsed.username || '(unknown)';
            this.logger.log(`Connecting to database host=${parsed.host} db=${dbName} user=${user}`);
        }
        catch (e) {
            this.logger.error(`Failed to parse DATABASE_URL: ${e.message}`);
        }
        try {
            await this.$connect();
            this.logger.log('Database connected');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Database connection failed: ${message}`);
            if (this.allowStartWithoutDb()) {
                this.logger.warn('Continuing without a database connection (ALLOW_START_WITHOUT_DB=true)');
                return;
            }
            throw error;
        }
    }
    async onModuleDestroy() {
        try {
            await this.$disconnect();
            this.logger.log('Database disconnected');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Database disconnect failed: ${message}`);
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map