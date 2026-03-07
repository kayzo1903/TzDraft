import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma/prisma.module';
import { PrismaGameRepository } from './prisma-game.repository';
import { PrismaMoveRepository } from './prisma-move.repository';
import { RedisMatchmakingRepository } from './redis-matchmaking.repository';

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
      useClass: RedisMatchmakingRepository,
    },
  ],
  exports: ['IGameRepository', 'IMoveRepository', 'IMatchmakingRepository'],
})
export class RepositoryModule {}
