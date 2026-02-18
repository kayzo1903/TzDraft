import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private static instanceCount = 0;
  private readonly retryMax = Number(process.env.PRISMA_RETRY_MAX ?? 2);
  private readonly retryBaseDelayMs = Number(
    process.env.PRISMA_RETRY_BASE_DELAY_MS ?? 150,
  );

  constructor() {
    PrismaService.instanceCount++;
    // Explicitly pass the database URL from environment to ensure it's used
    const url = process.env.DATABASE_URL;
    super({
      datasources: {
        db: {
          url,
        },
      },
      log: ['info', 'warn', 'error'],
    });

    this.logger.warn(
      `PrismaService instantiated. Count: ${PrismaService.instanceCount}`,
    );

    this.setupTransientRetry();

    if (!url) {
      this.logger.error(
        'DATABASE_URL is not defined in process.env in constructor',
      );
    } else {
      this.logger.log(
        `Initialized PrismaClient with URL length: ${url.length}`,
      );
    }
  }

  private setupTransientRetry() {
    // Avoid negative / NaN configs causing infinite loops.
    const maxRetries = Number.isFinite(this.retryMax)
      ? Math.max(0, Math.floor(this.retryMax))
      : 0;
    const baseDelayMs = Number.isFinite(this.retryBaseDelayMs)
      ? Math.max(0, Math.floor(this.retryBaseDelayMs))
      : 0;

    if (maxRetries === 0) return;

    this.$use(async (params, next) => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await next(params);
        } catch (error: any) {
          const code = error?.code as string | undefined;
          const isTransient =
            code === 'P1001' || // Can't reach database server
            code === 'P1002' || // Connection timed out
            code === 'P1017'; // Server closed the connection

          if (!isTransient || attempt >= maxRetries) {
            throw error;
          }

          const delayMs =
            baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
          this.logger.warn(
            `Prisma transient error ${code ?? '(unknown)'} on ${params.model ?? 'raw'}.${params.action}. ` +
              `Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries}).`,
          );

          try {
            // Attempt to restore connectivity before retrying.
            await this.$connect();
          } catch (connectError) {
            // Ignore; next(params) will surface the real error if still down.
            this.logger.warn(
              `Prisma reconnect attempt failed: ${
                connectError instanceof Error
                  ? connectError.message
                  : String(connectError)
              }`,
            );
          }

          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      // Unreachable: loop either returns or throws.
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw new Error('Prisma retry middleware fell through unexpectedly');
    });
  }

  private shouldConnectOnStartup(): boolean {
    const raw = (process.env.DB_CONNECT_ON_STARTUP ?? 'true').toLowerCase();
    return raw !== 'false' && raw !== '0' && raw !== 'no';
  }

  private allowStartWithoutDb(): boolean {
    const raw = (process.env.ALLOW_START_WITHOUT_DB ?? 'false').toLowerCase();
    return raw === 'true' || raw === '1' || raw === 'yes';
  }

  async onModuleInit() {
    if (!this.shouldConnectOnStartup()) {
      this.logger.warn(
        'Skipping database connect on startup (DB_CONNECT_ON_STARTUP=false)',
      );
      return;
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      const message = 'DATABASE_URL is not set';
      if (this.allowStartWithoutDb()) {
        this.logger.error(message);
        this.logger.warn(
          'Continuing without a database connection (ALLOW_START_WITHOUT_DB=true)',
        );
        return;
      }
      throw new Error(message);
    }

    try {
      if (!databaseUrl) {
        this.logger.error('CRITICAL: DATABASE_URL is undefined/empty');
      } else {
        this.logger.log(`Raw DATABASE_URL length: ${databaseUrl.length}`);
        // Careful not to log passwords, but log the host part extensively
        const safeUrl = databaseUrl.replace(/:[^:]*@/, ':***@');
        this.logger.log(`Connection string: ${safeUrl}`);
      }

      const parsed = new URL(databaseUrl);
      const dbName = (parsed.pathname || '').replace(/^\//, '') || '(default)';
      const user = parsed.username || '(unknown)';
      this.logger.log(
        `Connecting to database host=${parsed.host} db=${dbName} user=${user}`,
      );
    } catch (e) {
      this.logger.error(`Failed to parse DATABASE_URL: ${e.message}`);
      // Ignore invalid URLs here; Prisma will surface a concrete error on connect.
    }

    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database connection failed: ${message}`);

      if (this.allowStartWithoutDb()) {
        this.logger.warn(
          'Continuing without a database connection (ALLOW_START_WITHOUT_DB=true)',
        );
        return;
      }

      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Database disconnect failed: ${message}`);
    }
  }
}
