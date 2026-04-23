import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CommunicationService } from '../../../admin/communication.service';

/**
 * Public communication endpoint — no auth required.
 * Campaigns are broadcast content visible to all users, including guests.
 */
@Controller('communications')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Get('campaigns')
  async getCampaigns() {
    return this.communicationService.getActiveCampaigns();
  }

  @Post('campaigns/:id/track')
  async trackCampaign(
    @Param('id') id: string,
    @Query('event') event: 'opened' | 'clicked' | 'conversions',
    @Query('locale') locale: 'en' | 'sw' = 'en',
  ) {
    return this.communicationService.trackCampaignInteraction(id, event, locale);
  }
}
