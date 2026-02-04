import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma/prisma.module';
import { PrismaGameRepository } from './prisma-game.repository';
import { PrismaMoveRepository } from './prisma-move.repository';

/**
 * Repository Module
 * Provides repository implementations
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
  ],
  exports: ['IGameRepository', 'IMoveRepository'],
})
export class RepositoryModule {}
