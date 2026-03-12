import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../database/prisma/prisma.module';
import { PrismaService } from '../database/prisma/prisma.service';
import { RedisService } from '../cache/redis.service';
import { PrismaGameRepository } from './prisma-game.repository';
import { PrismaMoveRepository } from './prisma-move.repository';
import { RedisMatchmakingRepository } from './redis-matchmaking.repository';
import { PrismaMatchmakingRepository } from './prisma-matchmaking.repository';

/**
 * Repository Module
 * Provides repository implementations.
 * Matchmaking queue → Redis (sub-ms ops, Lua atomic claim).
 * Game state → Postgres with Redis read-through cache.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'IGameRepository',
      useClass: PrismaGameRepository,
    },
    {
      provide: 'IMoveRepository',
      useClass: PrismaMoveRepository,
    },
    {
      provide: 'IMatchmakingRepository',
      inject: [ConfigService, PrismaService, RedisService],
      useFactory: (
        config: ConfigService,
        prisma: PrismaService,
        redis: RedisService,
      ) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        return isProd
          ? new RedisMatchmakingRepository(redis)
          : new PrismaMatchmakingRepository(prisma);
      },
    },
  ],
  exports: ['IGameRepository', 'IMoveRepository', 'IMatchmakingRepository'],
})
export class RepositoryModule {}
