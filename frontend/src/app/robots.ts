import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/sw/auth/",
          "/en/auth/",
          "/sw/game/",
          "/en/game/",
          "/sw/admin/",
          "/en/admin/",
          "/studio/",
          // Tournament registration pages require auth — no SEO value
          "/sw/community/tournament/*/register",
          "/en/community/tournament/*/register",
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
