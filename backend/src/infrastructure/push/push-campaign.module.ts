import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma/prisma.module';
import { ExpoPushService } from './expo-push.service';
import { PushCampaignQueue } from './push-campaign.queue';
import { PushCampaignWorker } from './push-campaign.worker';

@Module({
  imports: [PrismaModule],
  providers: [ExpoPushService, PushCampaignQueue, PushCampaignWorker],
  exports: [ExpoPushService, PushCampaignQueue],
})
export class PushCampaignModule {}
