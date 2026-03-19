import { client, isSanityConfigured } from "@/sanity/client";
import { allArticlesQuery } from "@/sanity/queries";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { BookOpen } from "lucide-react";

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

export default async function LearnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let articles: ArticleSummary[] = [];
  if (isSanityConfigured) {
    try {
      articles = await client.fetch(
        allArticlesQuery,
        {},
        { next: { revalidate: 60 } },
      );
    } catch {
      articles = [];
    }
  }

  const featuredArticle = articles.find((a) => a.featured);
  const restArticles    = articles.filter((a) => !a.featured || a !== featuredArticle);

  const ui = {
    heading:    locale === "sw" ? "Makala & Mwongozo"                                                       : "Articles & Guides",
    subheading: locale === "sw" ? "Jifunze zaidi kuhusu Drafti ya Tanzania — sheria, historia, na mikakati." : "Learn more about Tanzania Drafti — rules, history, and strategy.",
    empty:      locale === "sw" ? "Hakuna makala bado. Rudi hivi karibuni."                                  : "No articles yet. Check back soon.",
    more:       locale === "sw" ? "Makala Zaidi"                                                             : "More Articles",
  };

  return (
    <main className="min-h-screen bg-[var(--background)] py-14 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-12">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <h1 className="text-4xl font-black text-white">{ui.heading}</h1>
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
                  <h2 className="text-lg font-bold text-white">{ui.more}</h2>
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

      </div>
    </main>
  );
}
