/**
 * Centralized support and administrative URLs for the TzDraft platform.
 * These links are opened via in-app WebBrowser for a seamless native feel.
 */
export const SUPPORT_URLS = {
  privacy: "https://tzdraft.co.tz/en/privacy",
  terms: "https://tzdraft.co.tz/en/terms",
  faq: "https://tzdraft.co.tz/en/support",
  support: "https://tzdraft.co.tz/en/support",
  rules: "https://tzdraft.co.tz/en/rules",
  website: "https://tzdraft.co.tz",
} as const;

export type SupportUrlKey = keyof typeof SUPPORT_URLS;
