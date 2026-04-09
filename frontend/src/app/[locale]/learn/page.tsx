import { client, isSanityConfigured } from "@/sanity/client";
import { allArticlesQuery, allTacticsQuery } from "@/sanity/queries";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { BookOpen, Sparkles, Target } from "lucide-react";
import type { Metadata } from "next";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";

// Revalidate every 60 seconds — new posts appear without a redeploy
export const revalidate = 60;

interface ArticleSummary {
  slug: string;
  title: { sw?: string; en?: string };
  description?: { sw?: string; en?: string };
  publishedAt?: string;
  coverImageUrl?: string;
  featured?: boolean;
  author?: string;
  category?: { slug: string; title: { sw?: string; en?: string } } | null;
}

interface TacticSummary {
  slug: string;
  title: string;
  description: { sw?: string; en?: string };
  difficulty: "beginner" | "intermediate" | "pro";
}

const META = {
  sw: {
    title: "Makala & Mwongozo | TzDraft",
    description: "Jifunze zaidi kuhusu Drafti ya Tanzania — sheria, historia, na mikakati kupitia makala zetu maalumu.",
  },
  en: {
    title: "Articles & Guides | TzDraft",
    description: "Learn more about Tanzania Drafti — rules, history, and strategy through our dedicated articles and guides.",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, "/learn", siteUrl);
  const m = META[locale as keyof typeof META] ?? META.en;
  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";
  const ogLocaleAlt = locale === "sw" ? "en_TZ" : "sw_TZ";

  return {
    title: m.title,
    description: m.description,
    alternates: {
      canonical,
      languages: getLanguageAlternates("/learn", siteUrl),
    },
    openGraph: {
      title: m.title,
      description: m.description,
      url: canonical,
      siteName: "TzDraft",
      locale: ogLocale,
      alternateLocale: [ogLocaleAlt],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description,
    },
  };
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let articles: ArticleSummary[] = [];
  let tactics: TacticSummary[] = [];

  if (isSanityConfigured) {
    try {
      const [receivedArticles, receivedTactics] = await Promise.all([
        client.fetch(allArticlesQuery, {}, { next: { revalidate: 60 } }),
        client.fetch(allTacticsQuery, {}, { next: { revalidate: 60 } }),
      ]);
      articles = receivedArticles;
      tactics = receivedTactics;
    } catch {
      articles = [];
      tactics = [];
    }
  }

  const featuredArticle = articles.find((a) => a.featured);
  const restArticles    = articles.filter((a) => a !== featuredArticle);

  const ui = {
    heading:    locale === "sw" ? "Makala & Mwongozo"                                                       : "Articles & Guides",
    subheading: locale === "sw" ? "Jifunze zaidi kuhusu Drafti ya Tanzania — sheria, historia, na mikakati." : "Learn more about Tanzania Drafti — rules, history, and strategy.",
    empty:      locale === "sw" ? "Hakuna makala bado. Rudi hivi karibuni."                                  : "No articles yet. Check back soon.",
    more:       locale === "sw" ? "Makala Zaidi"                                                             : "More Articles",
    playbookTitle: locale === "sw" ? "Drafti Playbook (Mbinu Rasmi)" : "Drafti Playbook (Official Tactics)",
    playbookSub: locale === "sw" 
      ? "Kusanya mbinu na 'copy' maarufu zinazotumiwa na mabingwa hapa nchini." 
      : "Discover the authentic 'copies' and tactics used by champions in Tanzania.",
  };

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'beginner': return 'text-green-400 border-green-400/20 bg-green-400/10';
      case 'pro': return 'text-red-400 border-red-400/20 bg-red-400/10';
      default: return 'text-[var(--primary)] border-[var(--primary)]/20 bg-[var(--primary)]/10';
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] py-14 px-4 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": articles.slice(0, 10).map((a, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Article",
                "headline": locale === "sw" ? (a.title.sw || a.title.en) : (a.title.en || a.title.sw),
                "description": locale === "sw" ? (a.description?.sw || a.description?.en) : (a.description?.en || a.description?.sw),
                "url": `${getSiteUrl()}/${locale}/learn/${a.slug}`
              }
            }))
          })
        }}
      />
      <div className="max-w-5xl mx-auto space-y-16">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tight">{ui.heading}</h1>
          </div>
          <p className="text-neutral-400 text-lg max-w-xl">{ui.subheading}</p>
        </div>

        {articles.length === 0 ? (
          <p className="text-neutral-500">{ui.empty}</p>
        ) : (
          <>
            {/* Featured article — full-width hero card */}
            {featuredArticle && (
              <ArticleCard {...featuredArticle} locale={locale} variant="featured" />
            )}

            {/* Rest of the articles */}
            {restArticles.length > 0 && (
              <section className="space-y-6">
                {featuredArticle && (
                  <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--primary)]" /> {ui.more}
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {restArticles.map((article) => (
                    <ArticleCard key={article.slug} {...article} locale={locale} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Tactics Playbook Section */}
        {tactics.length > 0 && (
          <section className="pt-8 space-y-8 border-t border-white/5">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-[var(--primary)]" />
                <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                  {ui.playbookTitle}
                </h2>
              </div>
              <p className="text-neutral-500 text-sm max-w-2xl">{ui.playbookSub}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {tactics.map((t) => (
                <div 
                  key={t.slug} 
                  className="group bg-[#1c1917] hover:bg-[#292524] border border-[#44403c] p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] cursor-default"
                >
                  <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border mb-3 w-fit ${getDifficultyColor(t.difficulty)}`}>
                    {t.difficulty}
                  </div>
                  <h3 className="text-white font-bold text-lg group-hover:text-[var(--primary)] transition-colors">
                    {t.title}
                  </h3>
                  <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1">
                    {locale === "sw" ? t.description.sw : t.description.en}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
