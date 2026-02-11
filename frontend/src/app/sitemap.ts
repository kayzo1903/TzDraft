import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const getSiteUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
};

const publicPaths = ["", "/play", "/rules", "/policy", "/support"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const items: MetadataRoute.Sitemap = [];
  for (const locale of routing.locales) {
    for (const path of publicPaths) {
      items.push({
        url: new URL(`/${locale}${path}`, siteUrl).toString(),
        lastModified,
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1 : 0.7,
      });
    }
  }

  return items;
}

