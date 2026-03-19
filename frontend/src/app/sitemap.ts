import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/seo";
import { client } from "@/sanity/client";
import { allSlugsQuery } from "@/sanity/queries";

const publicPaths = ["", "/play", "/rules", "/policy", "/support", "/learn"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const items: MetadataRoute.Sitemap = [];

  // Static public routes
  for (const locale of routing.locales) {
    for (const path of publicPaths) {
      items.push({
        url: new URL(`/${locale}${path}`, siteUrl).toString(),
        lastModified,
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1 : path === "/learn" ? 0.8 : 0.7,
      });
    }
  }

  // Dynamic article routes
  try {
    const slugs: { slug: string }[] = await client.fetch(allSlugsQuery);
    for (const { slug } of slugs) {
      for (const locale of routing.locales) {
        items.push({
          url: new URL(`/${locale}/learn/${slug}`, siteUrl).toString(),
          lastModified,
          changeFrequency: "monthly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Sanity unreachable at build time — skip article URLs gracefully
  }

  return items;
}
