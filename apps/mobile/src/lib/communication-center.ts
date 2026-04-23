import {
  type CommunicationCampaign,
  type CommunicationLocale,
  type CommunicationType,
  resolveCommunicationCampaign,
} from "@tzdraft/shared-client";
import { colors } from "../theme/colors";

export interface MobileCampaignTheme {
  primary: string;
  secondary: string;
  surface: string;
}

export interface MobileCommunicationInboxItem {
  id: string;
  campaignId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata: {
    source: "ADMIN_CAMPAIGN";
    campaignId: string;
    href: string;
    deepLink: string;
  };
}

const priorityWeight = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
} as const;

export function normalizeCommunicationLocale(locale?: string): CommunicationLocale {
  return locale === "sw" ? "sw" : "en";
}

export function getMobileCampaigns(locale: CommunicationLocale = "en", campaigns: CommunicationCampaign[] = []) {
  return [...campaigns]
    .map((campaign) => resolveCommunicationCampaign(campaign, locale))
    .filter(
      (campaign) =>
        campaign.channels.includes("MOBILE_IN_APP") ||
        campaign.channels.includes("MOBILE_PUSH") ||
        campaign.channels.includes("MOBILE_HOME_BANNER"),
    )
    .sort((left, right) => {
      const weightDifference =
        priorityWeight[right.priority] - priorityWeight[left.priority];
      if (weightDifference !== 0) return weightDifference;
      return new Date(right.schedule.sendAt).getTime() - new Date(left.schedule.sendAt).getTime();
    });
}

export function getCampaignTheme(type: CommunicationType): MobileCampaignTheme {
  if (type === "ALERT") {
    return {
      primary: colors.danger,
      secondary: "#7f1d1d",
      surface: "rgba(127, 29, 29, 0.22)",
    };
  }

  if (type === "PROMOTION") {
    return {
      primary: colors.primary,
      secondary: "#7c2d12",
      surface: "rgba(249, 115, 22, 0.18)",
    };
  }

  if (type === "ENGAGEMENT") {
    return {
      primary: colors.success,
      secondary: "#14532d",
      surface: "rgba(34, 197, 94, 0.16)",
    };
  }

  return {
    primary: "#38bdf8",
    secondary: "#164e63",
    surface: "rgba(56, 189, 248, 0.18)",
  };
}

export function getFeaturedMobileCampaign(
  campaigns: CommunicationCampaign[],
  dismissedCampaignIds: string[],
) {
  return campaigns.find(
    (campaign) =>
      campaign.status === "LIVE" &&
      campaign.channels.includes("MOBILE_HOME_BANNER") &&
      !dismissedCampaignIds.includes(campaign.id),
  );
}

export function getCampaignRoute(campaign: CommunicationCampaign) {
  return campaign.cta.href;
}

export function getCampaignDetailRoute(campaignId: string) {
  return `/community/announcement/${campaignId}`;
}

export function getMobileCampaignById(
  campaignId: string,
  locale: CommunicationLocale = "en",
  campaigns: CommunicationCampaign[] = [],
) {
  return (
    getMobileCampaigns(locale, campaigns).find(
      (campaign) => campaign.id === campaignId,
    ) ?? null
  );
}

export function getCampaignRouteFromData(data: Record<string, any> | undefined) {
  if (!data) return null;

  if (typeof data.href === "string" && data.href.length > 0) {
    return data.href;
  }

  const screen = typeof data.screen === "string" ? data.screen : "";

  if (screen === "support") return "/support";
  if (screen === "learn") return "/learn";
  if (screen === "notifications") return "/notifications";

  return null;
}

export function toMobileCampaignInboxItems(
  campaigns: CommunicationCampaign[],
  readCampaignIds: string[],
): MobileCommunicationInboxItem[] {
  return campaigns
    .filter(
      (campaign) =>
        campaign.channels.includes("MOBILE_IN_APP") &&
        (campaign.status === "LIVE" || campaign.status === "SENT"),
    )
    .map((campaign) => ({
      id: campaign.id,
      campaignId: campaign.id,
      type: `ADMIN_${campaign.type}`,
      title: campaign.title,
      body: campaign.body,
      read: readCampaignIds.includes(campaign.id),
      createdAt: campaign.schedule.sendAt,
      metadata: {
        source: "ADMIN_CAMPAIGN" as const,
        campaignId: campaign.id,
        href: campaign.cta.href,
        deepLink: campaign.cta.deepLink,
      },
    }))
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}
