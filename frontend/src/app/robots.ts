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
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
