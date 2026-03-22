import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/seo";
import { client, isSanityConfigured } from "@/sanity/client";
import { allSlugsQuery } from "@/sanity/queries";

const publicPaths = [
  "",
  "/play",
  "/leaderboard",
  "/learn",
  "/rules",
  "/policy",
  "/support",
  "/community/tournament",
  "/game/setup-online",
  "/game/setup-friend",
  "/game/setup-ai",
] as const;

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
        changeFrequency:
          path === "" ? "daily"
          : path === "/community/tournament" ? "daily"
          : path === "/leaderboard" ? "hourly"
          : "weekly",
        priority:
          path === "" ? 1
          : path === "/game/setup-online" ? 0.9
          : path === "/leaderboard" ? 0.85
          : path === "/learn" || path === "/community/tournament" ? 0.8
          : path === "/game/setup-friend" || path === "/game/setup-ai" ? 0.75
          : 0.7,
      });
    }
  }

  // Dynamic tournament detail pages
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      const res = await fetch(`${apiUrl}/tournaments`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const tournaments: { id: string; status: string }[] = await res.json();
        for (const t of tournaments) {
          if (t.status === 'DRAFT' || t.status === 'CANCELLED') continue;
          const changeFrequency = t.status === 'ACTIVE' ? 'hourly' : t.status === 'REGISTRATION' ? 'daily' : 'weekly';
          const priority = t.status === 'ACTIVE' ? 0.85 : 0.7;
          for (const locale of routing.locales) {
            items.push({
              url: new URL(`/${locale}/community/tournament/${t.id}`, siteUrl).toString(),
              lastModified,
              changeFrequency: changeFrequency as any,
              priority,
            });
          }
        }
      }
    }
  } catch {
    // API unreachable at build time — skip tournament URLs
  }

  // Dynamic article routes — skip if Sanity is not configured at build time
  if (!isSanityConfigured) return items;
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
