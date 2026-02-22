import { Module } from '@nestjs/common';
import { FriendService } from './friend.service';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { FriendlyMatchService } from './friendly-match.service';

@Module({
  imports: [PrismaModule],
  providers: [FriendService, FriendlyMatchService],
  exports: [FriendService, FriendlyMatchService],
})
export class FriendModule {}
