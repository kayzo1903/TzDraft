import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { HttpModule } from './interface/http/http.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './domain/user/user.module';
import { EngineModule } from './infrastructure/engine/engine.module';
import { TasksModule } from './infrastructure/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 100 HTTP requests per IP per minute globally; override per route with @Throttle()
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // Enables @Cron / @Interval decorators
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UserModule,
    HttpModule,
    EngineModule, // Provides SidraAdapter globally
    TasksModule,  // Scheduled cleanup jobs
  ],
  controllers: [],
  providers: [
    // Apply rate limiting to every HTTP endpoint globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
