import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommunicationService } from './communication.service';

/**
 * Runs every minute to promote SCHEDULED campaigns that have passed
 * their sendAt timestamp to LIVE or SENT, and fires push delivery.
 * Gap #7 fix.
 */
@Injectable()
export class CommunicationSchedulerService {
  private readonly logger = new Logger(CommunicationSchedulerService.name);

  constructor(private readonly communicationService: CommunicationService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns() {
    try {
      await this.communicationService.processScheduledCampaigns();
    } catch (err: any) {
      this.logger.error(
        `[Scheduler] Failed to process scheduled campaigns: ${err?.message}`,
      );
    }
  }
}
