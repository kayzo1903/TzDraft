import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { CommunicationService } from './communication.service';
import { CommunicationSchedulerService } from './communication-scheduler.service';
import { ExpoPushService } from '../infrastructure/push/expo-push.service';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  providers: [
    CommunicationService,
    CommunicationSchedulerService,
    ExpoPushService,
  ],
  exports: [CommunicationService],
})
export class CommunicationModule {}
