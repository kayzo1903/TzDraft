import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../lib/api";
import { useTranslation } from "react-i18next";
import { type CommunicationCampaign } from "@tzdraft/shared-client";
import {
  getCampaignRoute,
  getCampaignDetailRoute,
  getFeaturedMobileCampaign,
  getMobileCampaignById,
  getMobileCampaigns,
  normalizeCommunicationLocale,
  toMobileCampaignInboxItems,
} from "../lib/communication-center";

const READ_STORAGE_KEY = "mobileCommunication.readCampaignIds";
const DISMISSED_POPUP_STORAGE_KEY = "mobileCommunication.dismissedPopupIds";
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes
let sessionDismissedBannerIds: string[] = [];

export function useMobileCommunicationCenter() {
  const { i18n } = useTranslation();
  const [readCampaignIds, setReadCampaignIds] = useState<string[]>([]);
  const [permanentlyDismissedPopupIds, setPermanentlyDismissedPopupIds] = useState<string[]>([]);
  const [dismissedBannerIds, setDismissedBannerIds] = useState<string[]>(
    sessionDismissedBannerIds,
  );
  const [rawCampaigns, setRawCampaigns] = useState<CommunicationCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const locale = normalizeCommunicationLocale(i18n.language);
  const campaigns = useMemo(
    () => getMobileCampaigns(locale, rawCampaigns),
    [locale, rawCampaigns],
  );

  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await api.get("/communications/campaigns");
      setRawCampaigns(response.data);
    } catch (err) {
      console.error("[Communication] Failed to fetch campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Load persistent state
    Promise.all([
      AsyncStorage.getItem(READ_STORAGE_KEY),
      AsyncStorage.getItem(DISMISSED_POPUP_STORAGE_KEY),
    ])
      .then(([storedReadIds, storedPopupIds]) => {
        if (!isMounted) return;
        setReadCampaignIds(
          storedReadIds ? (JSON.parse(storedReadIds) as string[]) : [],
        );
        setPermanentlyDismissedPopupIds(
          storedPopupIds ? (JSON.parse(storedPopupIds) as string[]) : [],
        );
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchCampaigns();

    // 1. Polling
    const interval = setInterval(fetchCampaigns, FETCH_INTERVAL);

    // 2. Refresh on foreground
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          fetchCampaigns();
        }
      },
    );

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [fetchCampaigns]);

  const inboxItems = useMemo(
    () => toMobileCampaignInboxItems(campaigns, readCampaignIds),
    [campaigns, readCampaignIds],
  );

  const featuredCampaign = useMemo(
    () => getFeaturedMobileCampaign(campaigns, dismissedBannerIds),
    [campaigns, dismissedBannerIds],
  );

  const modalCampaign = useMemo(() => {
    // Only show CRITICAL campaigns as a popup, and only ONCE per lifetime.
    return campaigns.find(
      (c) =>
        c.status === "LIVE" &&
        c.priority === "CRITICAL" &&
        !permanentlyDismissedPopupIds.includes(c.id),
    );
  }, [campaigns, permanentlyDismissedPopupIds]);

  const unreadCount = inboxItems.filter((item) => !item.read).length;

  const markCampaignRead = async (campaignId: string) => {
    if (readCampaignIds.includes(campaignId)) return;

    const nextIds = [...readCampaignIds, campaignId];
    setReadCampaignIds(nextIds);
    await AsyncStorage.setItem(READ_STORAGE_KEY, JSON.stringify(nextIds));

    // Track "opened" event
    trackInteraction(campaignId, "opened").catch(() => {});
  };

  const trackInteraction = async (
    campaignId: string,
    event: "opened" | "clicked" | "conversions",
  ) => {
    try {
      await api.post(`/communications/campaigns/${campaignId}/track`, null, {
        params: { event, locale },
      });
    } catch (err) {
      console.warn("[Communication] Tracking failed:", err);
    }
  };

  const dismissBanner = async (campaignId: string) => {
    if (dismissedBannerIds.includes(campaignId)) return;

    const nextIds = [...dismissedBannerIds, campaignId];
    sessionDismissedBannerIds = nextIds;
    setDismissedBannerIds(nextIds);
  };

  const dismissPopupPermanently = async (campaignId: string) => {
    if (permanentlyDismissedPopupIds.includes(campaignId)) return;

    const nextIds = [...permanentlyDismissedPopupIds, campaignId];
    setPermanentlyDismissedPopupIds(nextIds);
    await AsyncStorage.setItem(DISMISSED_POPUP_STORAGE_KEY, JSON.stringify(nextIds));
  };

  return {
    campaigns,
    featuredCampaign,
    modalCampaign,
    inboxItems,
    unreadCount,
    isLoading,
    markCampaignRead,
    trackInteraction,
    dismissBanner,
    dismissPopupPermanently,
    getCampaignRoute,
    getCampaignDetailRoute,
    getMobileCampaignById: (campaignId: string) =>
      getMobileCampaignById(campaignId, locale, rawCampaigns),
  };
}
