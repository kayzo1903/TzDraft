import { client, isSanityConfigured } from "@/sanity/client";
import { articleBySlugQuery, allSlugsQuery } from "@/sanity/queries";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import { notFound } from "next/navigation";
import { buildPageMetadata, getSiteUrl, isAppLocale } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import type { PortableTextBlock } from "@portabletext/react";
import { Calendar, ArrowLeft, User, Tag } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Article {
  slug: string;
  title: { sw?: string; en?: string };
  description?: { sw?: string; en?: string };
  keywords?: { sw?: string[]; en?: string[] };
  publishedAt?: string;
  coverImageUrl?: string;
  author?: string;
  category?: { slug: string; title: { sw?: string; en?: string } } | null;
  body?: { sw?: PortableTextBlock[]; en?: PortableTextBlock[] };
}

// Revalidate every 60 seconds so edits in Sanity appear without a redeploy
export const revalidate = 60;

export async function generateStaticParams() {
  if (!isSanityConfigured) return [];

  try {
    const slugs: { slug: string }[] = await client.fetch(allSlugsQuery);
    return slugs.flatMap((s) =>
      routing.locales.map((locale) => ({
        locale,
        slug: s.slug,
      })),
    );
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  try {
    const { locale, slug } = await params;
    if (!isAppLocale(locale) || !isSanityConfigured) return {};

    let article: Article | null = null;
    try {
      article = await client.fetch<Article | null>(articleBySlugQuery, { slug });
    } catch {
      return {};
    }
    if (!article) return {};

    const title = locale === "sw" ? article.title?.sw : article.title?.en;
    const description = locale === "sw" ? article.description?.sw : article.description?.en;
    const keywords = locale === "sw" ? article.keywords?.sw : article.keywords?.en;

    return buildPageMetadata({
      locale,
      path: `/learn/${slug}`,
      title: title ?? "",
      description: description ?? "",
      keywords,
      ogType: "article",
      ogImageUrl: article.coverImageUrl,
      ogImageAlt: title ?? "TzDraft article",
      articlePublishedTime: article.publishedAt,
      articleAuthors: article.author ? [article.author] : undefined,
    });
  } catch {
    return {};
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isSanityConfigured) notFound();

  let article: Article | null = null;
  try {
    article = await client.fetch<Article | null>(articleBySlugQuery, { slug });
  } catch {
    notFound();
  }
  if (!article) notFound();

  const title    = locale === "sw" ? (article.title?.sw || article.title?.en) : (article.title?.en || article.title?.sw);
  const body     = locale === "sw" ? article.body?.sw : article.body?.en;
  const category = locale === "sw" ? article.category?.title?.sw : article.category?.title?.en;
  const siteUrl = getSiteUrl();

  const formattedDate = article.publishedAt
    ? (() => {
        const d = new Date(article.publishedAt!);
        const icuLocale = locale === "sw" ? "sw-TZ" : "en-TZ";
        try {
          return d.toLocaleDateString(icuLocale, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        } catch {
          // Fallback: sw-TZ is not included in the slim Docker Node.js image's
          // small-icu data. Using en-US prevents a RangeError → 500 in production.
          return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      })()
    : null;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: locale === "sw" ? article.description?.sw : article.description?.en,
    datePublished: article.publishedAt,
    inLanguage: locale,
    image: article.coverImageUrl ?? `${siteUrl}logo/logo.png`,
    url: new URL(`/${locale}/learn/${slug}`, siteUrl).toString(),
    publisher: {
      "@type": "Organization",
      name: "TzDraft",
      url: siteUrl.toString(),
    },
  };

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale as (typeof routing.locales)[number]}
        items={[
          { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
          { name: locale === "sw" ? "Makala" : "Articles", path: "/learn" },
          { name: title || (locale === "sw" ? "Makala" : "Article") },
        ]}
      />
      <JsonLd data={articleSchema} />
      <main className="min-h-screen bg-background py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">

          {/* Back link */}
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {locale === "sw" ? "Rudi kwenye Makala" : "Back to Articles"}
          </Link>

          {/* Cover image */}
          {article.coverImageUrl && (
            <div className="rounded-2xl overflow-hidden mb-8 h-72">
              <img
                src={article.coverImageUrl}
                alt={title || ""}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Header */}
          <header className="mb-10 space-y-4">
            {/* Category pill */}
            {category && (
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Tag className="w-3.5 h-3.5" />
                {category}
              </div>
            )}

            <h1 className="text-4xl font-black text-white leading-tight">{title}</h1>

            {/* Meta row */}
            <div className="flex items-center gap-4 text-sm text-neutral-500 flex-wrap">
              {formattedDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={article.publishedAt}>{formattedDate}</time>
                </span>
              )}
              {article.author && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {article.author}
                </span>
              )}
            </div>
          </header>

          {/* Body */}
          <div className="border-t border-white/5 pt-8">
            {body ? (
              <ArticleBody body={body} locale={locale as "sw" | "en"} />
            ) : (
              <p className="text-neutral-500">
                {locale === "sw"
                  ? "Maudhui ya lugha hii hayapo bado."
                  : "Content for this language is not available yet."}
              </p>
            )}
          </div>

        </div>
      </main>
    </>
  );
}
