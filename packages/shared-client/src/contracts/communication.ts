export const communicationAudienceSegments = [
  "ALL_USERS",
  "NEW_USERS",
  "ACTIVE_USERS",
  "INACTIVE_USERS",
  "GAME_CREATORS",
  "NEVER_JOINED_GAME",
] as const;

export const communicationTypes = [
  "ANNOUNCEMENT",
  "PROMOTION",
  "ALERT",
  "ENGAGEMENT",
] as const;

export const communicationChannels = [
  "MOBILE_IN_APP",
  "MOBILE_PUSH",
  "MOBILE_HOME_BANNER",
  "EMAIL",
] as const;

export const communicationStatuses = [
  "DRAFT",
  "SCHEDULED",
  "LIVE",
  "SENT",
  "PAUSED",
] as const;

export const communicationPriorities = [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
] as const;

export type CommunicationAudienceSegment =
  (typeof communicationAudienceSegments)[number];
export type CommunicationType = (typeof communicationTypes)[number];
export type CommunicationChannel = (typeof communicationChannels)[number];
export type CommunicationStatus = (typeof communicationStatuses)[number];
export type CommunicationPriority = (typeof communicationPriorities)[number];
export type CommunicationLocale = "en" | "sw";

export interface CommunicationLocalizedText {
  en: string;
  sw: string;
}

export interface CommunicationCta {
  label: string;
  href: string;
  deepLink: string;
  supportingCopy?: string;
}

export interface CommunicationSchedule {
  mode: "instant" | "scheduled";
  timezone: string;
  sendAt: string;
  localLabel: string;
}

export interface LocaleDeliveryStats {
  eligibleUsers: number;
  delivered: number;
  opened: number;
  clicked: number;
  conversions: number;
}

export interface CommunicationDeliveryStats {
  eligibleUsers: number;
  delivered: number;
  opened: number;
  clicked: number;
  conversions: number;
  suppressedByCap: number;
  failed: number;
  byLocale?: Record<CommunicationLocale, LocaleDeliveryStats>;
}

export interface CommunicationMobilePresentation {
  badge: string;
  eyebrow: string;
  tone: "sunrise" | "ocean" | "ember" | "mint";
  bannerBody: string;
}

export interface CommunicationCampaign {
  id: string;
  title: string;
  body: string;
  localized: {
    title: CommunicationLocalizedText;
    body: CommunicationLocalizedText;
    ctaLabel: CommunicationLocalizedText;
    ctaSupportingCopy?: CommunicationLocalizedText;
    badge: CommunicationLocalizedText;
    eyebrow: CommunicationLocalizedText;
    bannerBody: CommunicationLocalizedText;
    goal: CommunicationLocalizedText;
    scheduleLocalLabel: CommunicationLocalizedText;
  };
  type: CommunicationType;
  status: CommunicationStatus;
  priority: CommunicationPriority;
  audience: CommunicationAudienceSegment;
  channels: CommunicationChannel[];
  cta: CommunicationCta;
  schedule: CommunicationSchedule;
  analytics: CommunicationDeliveryStats;
  mobilePresentation: CommunicationMobilePresentation;
  createdBy: string;
  createdAt: string;
  lastUpdatedAt: string;
  goal: string;
}

export interface CommunicationMessageHistoryItem {
  id: string;
  campaignId: string;
  label: string;
  channel: CommunicationChannel;
  happenedAt: string;
  status: "QUEUED" | "SENT" | "SUPPRESSED" | "CLICKED" | "CONVERTED";
  details: string;
}

export interface CommunicationOverviewMetric {
  label: string;
  value: string;
  delta: string;
}

export interface CommunicationProtectionPolicy {
  dailyCapPerUser: number;
  quietHoursLabel: string;
  alertOverridePriority: CommunicationPriority;
  preferenceAware: boolean;
  cooldownMinutesBetweenPromotions: number;
}

export interface CommunicationCenterSnapshot {
  overview: CommunicationOverviewMetric[];
  campaigns: CommunicationCampaign[];
  history: CommunicationMessageHistoryItem[];
  policy: CommunicationProtectionPolicy;
}

export const communicationAudienceLabels: Record<
  CommunicationAudienceSegment,
  string
> = {
  ALL_USERS: "All users",
  NEW_USERS: "New users",
  ACTIVE_USERS: "Active users",
  INACTIVE_USERS: "Inactive users",
  GAME_CREATORS: "Users who created games",
  NEVER_JOINED_GAME: "Users who never joined a game",
};

export const communicationTypeLabels: Record<CommunicationType, string> = {
  ANNOUNCEMENT: "Announcement",
  PROMOTION: "Promotion",
  ALERT: "Alert",
  ENGAGEMENT: "Engagement",
};

export const communicationChannelLabels: Record<CommunicationChannel, string> = {
  MOBILE_IN_APP: "In-app notification",
  MOBILE_PUSH: "Push notification",
  MOBILE_HOME_BANNER: "Mobile home banner",
  EMAIL: "Email",
};

export const communicationStatusLabels: Record<CommunicationStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  SENT: "Sent",
  PAUSED: "Paused",
};

export const communicationPriorityLabels: Record<
  CommunicationPriority,
  string
> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  CRITICAL: "Critical",
};

function getLocalizedValue(
  value: CommunicationLocalizedText | undefined,
  locale: CommunicationLocale,
  fallback: string,
) {
  if (!value) return fallback;
  return value[locale] || value.en || fallback;
}

export function resolveCommunicationCampaign(
  campaign: CommunicationCampaign,
  locale: CommunicationLocale,
): CommunicationCampaign {
  return {
    ...campaign,
    title: getLocalizedValue(campaign.localized.title, locale, campaign.title),
    body: getLocalizedValue(campaign.localized.body, locale, campaign.body),
    goal: getLocalizedValue(campaign.localized.goal, locale, campaign.goal),
    cta: {
      ...campaign.cta,
      label: getLocalizedValue(campaign.localized.ctaLabel, locale, campaign.cta.label),
      supportingCopy: getLocalizedValue(
        campaign.localized.ctaSupportingCopy,
        locale,
        campaign.cta.supportingCopy ?? "",
      ),
    },
    schedule: {
      ...campaign.schedule,
      localLabel: getLocalizedValue(
        campaign.localized.scheduleLocalLabel,
        locale,
        campaign.schedule.localLabel,
      ),
    },
    mobilePresentation: {
      ...campaign.mobilePresentation,
      badge: getLocalizedValue(
        campaign.localized.badge,
        locale,
        campaign.mobilePresentation.badge,
      ),
      eyebrow: getLocalizedValue(
        campaign.localized.eyebrow,
        locale,
        campaign.mobilePresentation.eyebrow,
      ),
      bannerBody: getLocalizedValue(
        campaign.localized.bannerBody,
        locale,
        campaign.mobilePresentation.bannerBody,
      ),
    },
  };
}


