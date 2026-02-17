import { Module } from '@nestjs/common';
import { FriendService } from './friend.service';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FriendService],
  exports: [FriendService],
})
export class FriendModule {}
