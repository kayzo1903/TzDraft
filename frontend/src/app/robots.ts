import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/api/",
          "/sw/auth/",
          "/en/auth/",
          "/sw/game/",
          "/en/game/",
          "/sw/admin/",
          "/en/admin/",
          "/sw/profile/",
          "/en/profile/",
          "/sw/settings/",
          "/en/settings/",
          "/studio/",
          "/sw/community/tournament/*/register",
          "/en/community/tournament/*/register",
        ],
      },
    ],
    host: siteUrl.hostname,
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
