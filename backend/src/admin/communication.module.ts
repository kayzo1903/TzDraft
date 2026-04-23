import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { PushCampaignModule } from '../infrastructure/push/push-campaign.module';
import { CommunicationService } from './communication.service';
import { CommunicationSchedulerService } from './communication-scheduler.service';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), PushCampaignModule],
  providers: [CommunicationService, CommunicationSchedulerService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
