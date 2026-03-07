import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { HttpModule } from './interface/http/http.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './domain/user/user.module';
import { EngineModule } from './infrastructure/engine/engine.module';
import { TasksModule } from './infrastructure/tasks/tasks.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        // Pretty-print in dev; structured JSON in production
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true, ignore: 'pid,hostname' } }
          : undefined,
        customProps: () => ({ service: 'tzdraft-backend' }),
        serializers: {
          req: (req) => ({ id: req.id, method: req.method, url: req.url }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
        // Don't log health-check noise
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
      },
    }),
    // 100 HTTP requests per IP per minute globally; override per route with @Throttle()
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // Enables @Cron / @Interval decorators
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    HttpModule,
    EngineModule, // Provides SidraAdapter globally
    TasksModule,  // Scheduled cleanup jobs
    HealthModule,
  ],
  controllers: [],
  providers: [
    // Apply rate limiting to every HTTP endpoint globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
