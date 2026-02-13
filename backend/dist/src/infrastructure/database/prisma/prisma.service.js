"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    logger = new common_1.Logger(PrismaService_1.name);
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
            const parsed = new URL(databaseUrl);
            const dbName = (parsed.pathname || '').replace(/^\//, '') || '(default)';
            const user = parsed.username || '(unknown)';
            this.logger.log(`Connecting to database host=${parsed.host} db=${dbName} user=${user}`);
        }
        catch {
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
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map