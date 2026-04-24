import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { PushCampaignQueue } from '../infrastructure/push/push-campaign.queue';
import { ExpoPushService } from '../infrastructure/push/expo-push.service';
import {
  CommunicationCenterSnapshot,
  CommunicationCampaign,
  CommunicationMessageHistoryItem,
  CommunicationType,
  CommunicationStatus,
  CommunicationPriority,
  CommunicationAudienceSegment,
  CommunicationChannel,
  CommunicationLocale,
} from '@tzdraft/shared-client';

export interface MessageDraft {
  title: Record<CommunicationLocale, string>;
  body: Record<CommunicationLocale, string>;
  ctaLabel: Record<CommunicationLocale, string>;
  ctaHref: string;
  audience: CommunicationAudienceSegment;
  type: CommunicationType;
  priority: CommunicationPriority;
  channels: CommunicationChannel[];
  scheduleMode: 'instant' | 'scheduled';
  scheduleDate?: string;
  scheduleTime?: string;
  timezone?: string;
}

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expoPush: ExpoPushService,
    private readonly pushQueue: PushCampaignQueue,
  ) {}

  async getSnapshot(): Promise<CommunicationCenterSnapshot> {
    const campaigns = await this.prisma.communicationCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { history: true },
    });

    // Map Prisma models to shared-client types
    const mappedCampaigns: CommunicationCampaign[] = campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      localized: c.localized as any,
      type: c.type as CommunicationType,
      status: c.status as CommunicationStatus,
      priority: c.priority as CommunicationPriority,
      audience: c.audience as CommunicationAudienceSegment,
      channels: c.channels as CommunicationChannel[],
      cta: c.cta as any,
      schedule: c.schedule as any,
      analytics: c.analytics as any,
      mobilePresentation: c.mobilePresentation as any,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      lastUpdatedAt: c.lastUpdatedAt.toISOString(),
      goal: c.goal,
    }));

    // Aggregate statistics
    const totalEligibleUsers = mappedCampaigns.reduce(
      (sum, c) => sum + (c.analytics.eligibleUsers || 0),
      0,
    );
    const totalDelivered = mappedCampaigns.reduce(
      (sum, c) => sum + (c.analytics.delivered || 0),
      0,
    );
    const totalOpened = mappedCampaigns.reduce(
      (sum, c) => sum + (c.analytics.opened || 0),
      0,
    );
    const totalClicked = mappedCampaigns.reduce(
      (sum, c) => sum + (c.analytics.clicked || 0),
      0,
    );
    const totalConversions = mappedCampaigns.reduce(
      (sum, c) => sum + (c.analytics.conversions || 0),
      0,
    );

    const history: CommunicationMessageHistoryItem[] = campaigns.flatMap((c) =>
      c.history.map((h) => ({
        id: h.id,
        campaignId: h.campaignId,
        label: h.label,
        channel: h.channel as CommunicationChannel,
        happenedAt: h.happenedAt.toISOString(),
        status: h.status as any,
        details: h.details,
      })),
    );

    return {
      overview: [
        {
          label: 'Mobile reach',
          value: totalEligibleUsers.toLocaleString(),
          delta: 'Total potential reach',
        },
        {
          label: 'Avg open rate',
          value:
            totalDelivered > 0
              ? `${((totalOpened / totalDelivered) * 100).toFixed(1)}%`
              : '0%',
          delta: 'Across all campaigns',
        },
        {
          label: 'CTR to game flow',
          value:
            totalOpened > 0
              ? `${((totalClicked / totalOpened) * 100).toFixed(1)}%`
              : '0%',
          delta: 'Engagement quality',
        },
        {
          label: 'Conversions',
          value: totalConversions.toLocaleString(),
          delta: 'Direct goal actions',
        },
      ],
      campaigns: mappedCampaigns,
      history: history.sort(
        (a, b) =>
          new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime(),
      ),
      policy: {
        dailyCapPerUser: 2,
        quietHoursLabel: '10:00 PM to 8:00 AM local time',
        alertOverridePriority: 'CRITICAL',
        preferenceAware: true,
        cooldownMinutesBetweenPromotions: 180,
      },
    };
  }

  async createCampaign(
    dto: MessageDraft,
    adminId: string,
  ): Promise<CommunicationCampaign> {
    const channels = dto.channels as string[];
    const isInstant = dto.scheduleMode === 'instant';

    // A campaign is LIVE if it needs to be visible on the mobile home screen/modals.
    // This includes any campaign with a home banner OR any high-priority campaign that should "pop".
    const needsHomePresence =
      channels.includes('MOBILE_HOME_BANNER') ||
      dto.priority === 'HIGH' ||
      dto.priority === 'CRITICAL';

    const status = isInstant
      ? needsHomePresence
        ? 'LIVE'
        : 'SENT'
      : 'SCHEDULED';

    const campaign = await this.prisma.communicationCampaign.create({
      data: {
        title: dto.title.en,
        body: dto.body.en,
        localized: {
          title: dto.title,
          body: dto.body,
          ctaLabel: dto.ctaLabel,
          scheduleLocalLabel: {
            en: isInstant
              ? 'Sent immediately'
              : `Scheduled for ${dto.scheduleDate}`,
            sw: isInstant
              ? 'Imetumwa sasa hivi'
              : `Imepangwa kwa ${dto.scheduleDate}`,
          },
        },
        type: dto.type,
        status,
        priority: dto.priority,
        audience: dto.audience,
        channels: dto.channels,
        cta: {
          label: dto.ctaLabel.en,
          href: dto.ctaHref,
          deepLink: dto.ctaHref,
        },
        schedule: {
          mode: dto.scheduleMode,
          timezone: dto.timezone || 'Africa/Nairobi',
          sendAt: isInstant
            ? new Date().toISOString()
            : new Date(`${dto.scheduleDate}T${dto.scheduleTime}`).toISOString(),
          localLabel: isInstant
            ? 'Sent immediately'
            : `${dto.scheduleDate} at ${dto.scheduleTime}`,
        },
        analytics: this.emptyAnalytics(),
        mobilePresentation: {
          badge:
            dto.type === 'PROMOTION'
              ? 'Promosheni'
              : dto.type === 'ALERT'
                ? 'Tahadhari'
                : 'Tangazo',
          eyebrow:
            dto.priority === 'HIGH' || dto.priority === 'CRITICAL'
              ? 'KIPAUMBELE CHA JUU'
              : 'TAARIFA MPYA',
          tone:
            dto.type === 'ALERT'
              ? 'ember'
              : dto.type === 'PROMOTION'
                ? 'sunrise'
                : 'ocean',
          bannerBody: dto.body.sw || dto.body.en,
        },
        createdBy: adminId,
        goal: 'GENERAL_ENGAGEMENT',
      },
    });

    // Create initial history entry
    await this.prisma.communicationMessageHistory.create({
      data: {
        campaignId: campaign.id,
        label: isInstant ? 'Campaign launched' : 'Campaign scheduled',
        channel: dto.channels[0] || 'MOBILE_IN_APP',
        status: 'SENT',
        details: `Created by admin ${adminId}`,
      },
    });

    if (isInstant && channels.includes('MOBILE_PUSH')) {
      await this.enqueuePush(
        campaign.id,
        campaign.audience,
        campaign.title,
        campaign.body,
      );
    }

    return this.mapCampaign(campaign);
  }

  async getActiveCampaigns(): Promise<CommunicationCampaign[]> {
    const campaigns = await this.prisma.communicationCampaign.findMany({
      where: {
        status: { in: ['LIVE', 'SENT'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((c) => this.mapCampaign(c));
  }

  // ─── Lifecycle management ────────────────────────────────────────────────

  async saveDraftCampaign(
    dto: any,
    adminId: string,
  ): Promise<CommunicationCampaign> {
    const campaign = await this.prisma.communicationCampaign.create({
      data: {
        title: dto.title?.en || 'Untitled draft',
        body: dto.body?.en || '',
        localized: {
          title: dto.title ?? { en: '', sw: '' },
          body: dto.body ?? { en: '', sw: '' },
          ctaLabel: dto.ctaLabel ?? { en: '', sw: '' },
          goal: { en: 'GENERAL_ENGAGEMENT', sw: 'Ushirikiano wa jumla' },
          badge: { en: 'New', sw: 'Mpya' },
          eyebrow: { en: 'Campaign', sw: 'Kampeni' },
          bannerBody: { en: dto.body?.en ?? '', sw: dto.body?.sw ?? '' },
          scheduleLocalLabel: { en: 'Immediate', sw: 'Sasa hivi' },
        },
        type: dto.type ?? 'ANNOUNCEMENT',
        status: 'DRAFT',
        priority: dto.priority ?? 'NORMAL',
        audience: dto.audience ?? 'ACTIVE_USERS',
        channels: dto.channels ?? [],
        cta: {
          label: dto.ctaLabel?.en ?? '',
          href: dto.ctaHref ?? '',
          deepLink: `drafti://${dto.ctaHref ?? ''}`,
        },
        schedule: {
          mode: 'instant',
          timezone: dto.timezone ?? 'Africa/Nairobi',
          sendAt: new Date().toISOString(),
          localLabel: 'Draft — not scheduled',
        },
        analytics: this.emptyAnalytics(),
        mobilePresentation: {
          badge: 'New',
          eyebrow: 'Campaign',
          tone: 'sunrise',
          bannerBody: dto.body?.en ?? '',
        },
        createdBy: adminId,
        goal: 'GENERAL_ENGAGEMENT',
      },
    });

    return this.mapCampaign(campaign);
  }

  async trackCampaignInteraction(
    campaignId: string,
    event: 'opened' | 'clicked' | 'conversions',
    locale: 'en' | 'sw' = 'en',
  ): Promise<void> {
    const campaign = await this.prisma.communicationCampaign.findUnique({
      where: { id: campaignId },
      select: { analytics: true },
    });
    if (!campaign) return;

    const analytics = campaign.analytics as any;
    const nextAnalytics = { ...analytics };

    // Increment global
    nextAnalytics[event] = (nextAnalytics[event] || 0) + 1;

    // Increment locale-specific
    if (nextAnalytics.byLocale?.[locale]) {
      nextAnalytics.byLocale[locale][event] =
        (nextAnalytics.byLocale[locale][event] || 0) + 1;
    }

    await this.prisma.communicationCampaign.update({
      where: { id: campaignId },
      data: { analytics: nextAnalytics },
    });

    // Also log to history for audit trail
    await this.prisma.communicationMessageHistory.create({
      data: {
        campaignId,
        label: `User interaction: ${event.toUpperCase()}`,
        channel: 'MOBILE_IN_APP',
        status:
          event === 'conversions'
            ? 'CONVERTED'
            : event === 'clicked'
              ? 'CLICKED'
              : 'SENT',
        details: `User interacted with campaign in ${locale.toUpperCase()}`,
      },
    });
  }

  async updateCampaign(
    campaignId: string,
    dto: any,
  ): Promise<CommunicationCampaign> {
    const existing = await this.prisma.communicationCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!existing) throw new NotFoundException('Campaign not found');

    const updated = await this.prisma.communicationCampaign.update({
      where: { id: campaignId },
      data: {
        ...(dto.title && { title: dto.title.en }),
        ...(dto.body && { body: dto.body.en }),
        ...(dto.type && { type: dto.type }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.audience && { audience: dto.audience }),
        ...(dto.channels && { channels: dto.channels }),
        ...(dto.status && { status: dto.status }),
        // Auto-promote to LIVE if we now have home presence requirements
        ...((existing.status === 'SENT' || existing.status === 'DRAFT') &&
        (dto.channels?.includes('MOBILE_HOME_BANNER') ||
          existing.channels.includes('MOBILE_HOME_BANNER') ||
          dto.priority === 'HIGH' ||
          dto.priority === 'CRITICAL' ||
          existing.priority === 'HIGH' ||
          existing.priority === 'CRITICAL')
          ? { status: 'LIVE' }
          : {}),
        ...(dto.title || dto.body || dto.ctaLabel
          ? {
              localized: {
                ...(existing.localized as any),
                ...(dto.title && { title: dto.title }),
                ...(dto.body && { body: dto.body, bannerBody: dto.body }),
                ...(dto.ctaLabel && { ctaLabel: dto.ctaLabel }),
              },
            }
          : {}),
      },
    });

    await this.prisma.communicationMessageHistory.create({
      data: {
        campaignId,
        label: 'Campaign updated',
        channel: ((existing.channels as string[])[0] as any) || 'MOBILE_IN_APP',
        status: 'SENT',
        details: `Updated fields: ${Object.keys(dto).join(', ')}`,
      },
    });

    return this.mapCampaign(updated);
  }

  async pauseCampaign(campaignId: string): Promise<CommunicationCampaign> {
    const existing = await this.prisma.communicationCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!existing) throw new NotFoundException('Campaign not found');

    const updated = await this.prisma.communicationCampaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    await this.prisma.communicationMessageHistory.create({
      data: {
        campaignId,
        label: 'Campaign paused',
        channel: ((existing.channels as string[])[0] as any) || 'MOBILE_IN_APP',
        status: 'SUPPRESSED',
        details: 'Manually paused by admin',
      },
    });

    return this.mapCampaign(updated);
  }

  async deleteCampaign(campaignId: string): Promise<{ id: string }> {
    const existing = await this.prisma.communicationCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!existing) throw new NotFoundException('Campaign not found');

    await this.prisma.communicationCampaign.delete({
      where: { id: campaignId },
    });
    return { id: campaignId };
  }

  /**
   * Called by CommunicationSchedulerService every minute.
   * Promotes SCHEDULED campaigns whose sendAt has passed to LIVE/SENT
   * and triggers push delivery for MOBILE_PUSH channel.
   */
  async processScheduledCampaigns(): Promise<void> {
    const now = new Date();

    const due = await this.prisma.communicationCampaign.findMany({
      where: { status: 'SCHEDULED' },
    });

    for (const campaign of due) {
      const schedule = campaign.schedule as any;
      const sendAt = schedule?.sendAt ? new Date(schedule.sendAt) : null;
      if (!sendAt || sendAt > now) continue;

      const channels = campaign.channels as string[];
      const needsHomePresence =
        channels.includes('MOBILE_HOME_BANNER') ||
        campaign.priority === 'HIGH' ||
        campaign.priority === 'CRITICAL';
      const newStatus = needsHomePresence ? 'LIVE' : 'SENT';

      await this.prisma.communicationCampaign.update({
        where: { id: campaign.id },
        data: { status: newStatus },
      });

      this.logger.log(
        `[Scheduler] Campaign ${campaign.id} promoted to ${newStatus}`,
      );

      if (channels.includes('MOBILE_PUSH')) {
        await this.enqueuePush(
          campaign.id,
          campaign.audience,
          campaign.title,
          campaign.body,
        );
      }

      await this.prisma.communicationMessageHistory.create({
        data: {
          campaignId: campaign.id,
          label: `Campaign ${newStatus === 'LIVE' ? 'went live' : 'sent'} (scheduled)`,
          channel: 'MOBILE_IN_APP',
          status: 'SENT',
          details: `Auto-promoted by scheduler at ${now.toISOString()}`,
        },
      });
    }
  }

  /**
   * Enqueues a paginated push delivery job via BullMQ.
   * Falls back to a single synchronous page if Redis is unavailable.
   */
  async enqueuePush(
    campaignId: string,
    audience: string,
    title: string,
    body: string,
  ): Promise<void> {
    if (this.pushQueue.isAvailable) {
      await this.pushQueue.enqueueSendCampaign({
        campaignId,
        audience,
        title,
        body,
        cursor: null,
        totalDelivered: 0,
      });
      this.logger.log(
        `[Push] Campaign ${campaignId} enqueued for async delivery`,
      );
      return;
    }

    // Fallback: Redis unavailable — deliver synchronously (dev/small installs).
    try {
      const where = this.audienceWhere(audience);
      const users = await this.prisma.user.findMany({
        where: { ...where, pushToken: { not: null } },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);
      if (userIds.length === 0) return;

      const ticketIds = await this.expoPush.sendToUsers(userIds, title, body, {
        type: 'ADMIN_ANNOUNCEMENT',
        campaignId,
        href: `/community/announcement/${campaignId}`,
        screen: 'notifications',
      });

      this.logger.log(
        `[Push] Campaign ${campaignId} sync-delivered to ${userIds.length} users`,
      );

      const row = await this.prisma.communicationCampaign.findUnique({
        where: { id: campaignId },
        select: { analytics: true },
      });
      if (row) {
        const current = row.analytics as any;
        await this.prisma.communicationCampaign.update({
          where: { id: campaignId },
          data: {
            analytics: {
              ...current,
              eligibleUsers: userIds.length,
              delivered: userIds.length,
            },
          },
        });
      }

      void ticketIds; // receipt check not available without queue
    } catch (err: any) {
      this.logger.error(`[Push] Campaign sync push failed: ${err?.message}`);
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private mapCampaign(c: any): CommunicationCampaign {
    return {
      id: c.id,
      title: c.title,
      body: c.body,
      localized: c.localized,
      type: c.type as CommunicationType,
      status: c.status as CommunicationStatus,
      priority: c.priority as CommunicationPriority,
      audience: c.audience as CommunicationAudienceSegment,
      channels: c.channels as CommunicationChannel[],
      cta: c.cta,
      schedule: c.schedule,
      analytics: c.analytics,
      mobilePresentation: c.mobilePresentation,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      lastUpdatedAt: c.lastUpdatedAt.toISOString(),
      goal: c.goal,
    };
  }

  private emptyAnalytics() {
    const locale = {
      eligibleUsers: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      conversions: 0,
    };
    return {
      eligibleUsers: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      conversions: 0,
      suppressedByCap: 0,
      failed: 0,
      byLocale: { en: { ...locale }, sw: { ...locale } },
    };
  }

  private audienceWhere(audience: string): Record<string, any> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    switch (audience) {
      case 'NEW_USERS':
        return { createdAt: { gte: sevenDaysAgo } };
      case 'ACTIVE_USERS':
        return { lastSeenAt: { gte: sevenDaysAgo } };
      case 'INACTIVE_USERS':
        return { lastSeenAt: { lt: thirtyDaysAgo } };
      case 'NEVER_JOINED_GAME':
        return { gamesCreated: 0 };
      case 'ALL_USERS':
      default:
        return {};
    }
  }
}
