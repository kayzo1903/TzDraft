import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getLanguageAlternates, getSiteUrl } from "@/lib/seo";
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
  const seen = new Set<string>();

  const pushSitemapEntry = (entry: MetadataRoute.Sitemap[number]) => {
    if (seen.has(entry.url)) return;
    seen.add(entry.url);
    items.push(entry);
  };

  pushSitemapEntry({
    url: new URL("/", siteUrl).toString(),
    lastModified,
    changeFrequency: "daily",
    priority: 1,
    alternates: {
      languages: getLanguageAlternates("", siteUrl),
    },
  });

  // Static public routes
  for (const locale of routing.locales) {
    for (const path of publicPaths) {
      pushSitemapEntry({
        url: new URL(`/${locale}${path}`, siteUrl).toString(),
        lastModified,
        changeFrequency:
          path === ""
            ? "daily"
            : path === "/community/tournament"
              ? "daily"
              : path === "/leaderboard"
                ? "hourly"
                : "weekly",
        priority:
          path === ""
            ? 1
            : path === "/game/setup-online"
              ? 0.9
              : path === "/leaderboard"
                ? 0.85
                : path === "/learn" || path === "/community/tournament"
                  ? 0.8
                  : path === "/game/setup-friend" || path === "/game/setup-ai"
                    ? 0.75
                    : 0.7,
        alternates: {
          languages: getLanguageAlternates(path, siteUrl),
        },
      });
    }
  }

  // Dynamic tournament detail pages
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      const res = await fetch(`${apiUrl}/tournaments`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const tournaments: { id: string; status: string; updatedAt?: string }[] =
          await res.json();
        for (const t of tournaments) {
          if (!t.id) continue;
          if (t.status === "DRAFT" || t.status === "CANCELLED") continue;

          const changeFrequency =
            t.status === "ACTIVE"
              ? "hourly"
              : t.status === "REGISTRATION"
                ? "daily"
                : "weekly";
          const priority = t.status === "ACTIVE" ? 0.85 : 0.7;
          const path = `/community/tournament/${t.id}`;
          const tournamentLastModified = t.updatedAt
            ? new Date(t.updatedAt)
            : lastModified;

          for (const locale of routing.locales) {
            pushSitemapEntry({
              url: new URL(`/${locale}${path}`, siteUrl).toString(),
              lastModified: tournamentLastModified,
              changeFrequency: changeFrequency as any,
              priority,
              alternates: {
                languages: getLanguageAlternates(path, siteUrl),
              },
            });
          }
        }
      }
    }
  } catch {
    // API unreachable at build time - skip tournament URLs
  }

  // Dynamic article routes - skip if Sanity is not configured at build time
  if (!isSanityConfigured) return items;
  try {
    const slugs: { slug: string }[] = await client.fetch(allSlugsQuery);
    for (const { slug } of slugs) {
      const path = `/learn/${slug}`;
      for (const locale of routing.locales) {
        pushSitemapEntry({
          url: new URL(`/${locale}${path}`, siteUrl).toString(),
          lastModified,
          changeFrequency: "monthly",
          priority: 0.8,
          alternates: {
            languages: getLanguageAlternates(path, siteUrl),
          },
        });
      }
    }
  } catch {
    // Sanity unreachable at build time - skip article URLs gracefully
  }

  return items;
}
