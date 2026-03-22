import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/sw/game/setup-online",
          "/en/game/setup-online",
          "/sw/game/setup-friend",
          "/en/game/setup-friend",
          "/sw/game/setup-ai",
          "/en/game/setup-ai",
        ],
        disallow: [
          "/sw/auth/",
          "/en/auth/",
          "/sw/game/",
          "/en/game/",
          "/sw/admin/",
          "/en/admin/",
          "/sw/profile/",
          "/en/profile/",
          "/studio/",
          "/sw/community/tournament/*/register",
          "/en/community/tournament/*/register",
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
