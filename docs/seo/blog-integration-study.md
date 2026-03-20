# Blog / Learn Section — Integration Study
**Date:** March 2026
**Stack context:** Next.js App Router · next-intl (sw/en) · Tailwind v4 · Server Components first · No existing CMS

---

## What the codebase already tells us

| Constraint | Impact on blog choice |
|---|---|
| next-intl with `messages/{sw,en}.json` | Blog content must be bilingual (sw + en) from day one |
| `[locale]` URL segment wraps all routes | Blog lives at `/sw/learn/...` and `/en/learn/...` automatically |
| Rules + policy use inline TypeScript objects | Proven static-content pattern — but doesn't scale to long articles |
| No `@tailwindcss/typography` plugin | Need to add it for readable long-form prose |
| App Router + Server Components | Content must be RSC-compatible, no client-side data fetching |
| Monorepo build, no external services | Prefer file-based over CMS (no new hosted dependency) |
| 5–10 articles near-term, SEO-first goal | Overkill to build a full CMS; simplicity wins |

---

## Options evaluated

### Option A — Extend the inline TypeScript pattern (rules/policy style)
One `.ts` file per article, exporting bilingual content objects.

```
src/content/learn/
  sheria-za-drafti.ts   ← exports { sw: {...}, en: {...} }
  mkakati-wanaoanza.ts
```

**Pro:** Zero new deps, fully type-safe, perfectly SSR, consistent with existing code.
**Con:** Writing long-form content as TypeScript objects is painful. No markdown formatting. Non-devs can't contribute. Hard to add images, headings, code blocks cleanly.
**Verdict:** Good for < 500 words. Breaks down for real articles.

---

### Option B — @next/mdx (official, static MDX in app/)
MDX files live inside `app/[locale]/learn/[slug]/page.mdx`.

**Pro:** Zero runtime, official Next.js support, fastest possible build output.
**Con:** MDX files must live inside `app/` — this clashes with dynamic `[locale]/[slug]` routing. You'd need one MDX file per locale per article inside the app directory tree, which defeats the purpose of `[locale]` params. Very hard to build a dynamic listing page across slugs.
**Verdict:** Works for a single static page (like rules), not for a content collection.

---

### Option C — Contentlayer / Contentlayer2
**Verdict:** Contentlayer is officially deprecated (Jan 2025). Contentlayer2 is a community fork, not recommended for new projects.

---

### Option D — Headless CMS (Sanity, Contentful, Notion API)
External service manages content; frontend fetches at build time or runtime.

**Pro:** Non-dev writers, media uploads, rich preview, workflow approvals.
**Con:** External dependency, cost (Sanity free tier limits), requires API keys + env vars, network latency on ISR fetches, overkill for 5–10 articles written by devs.
**Verdict:** Revisit when team is > 3 people and content velocity is > 2 articles/week.

---

### Option E — next-mdx-remote/rsc + gray-matter ✅ RECOMMENDED
MDX files in `frontend/content/learn/{locale}/{slug}.mdx`.
Loaded at request time by the RSC page via a `content.ts` utility.
Rendered by `next-mdx-remote/rsc` which runs entirely on the server.

**Pro:**
- Content files are pure Markdown — anyone can write them
- Bilingual by directory (`sw/` and `en/`) — mirrors the URL pattern exactly
- RSC-only: no client JS added, perfect for SEO
- Custom MDX components: can embed `<Tip>`, `<Rule>`, `<GamePosition>` blocks
- `gray-matter` frontmatter: title, description, date, keywords, author — feeds metadata directly into `generateMetadata()`
- `Article` JSON-LD schema auto-generated from frontmatter
- Listing page built from `fs.readdirSync` — no build plugin needed

**Con:**
- `next-mdx-remote` compiles MDX at request time (not build time) — adds ~10–30ms per request. Acceptable; can add `cache()` wrapper.
- Tailwind v4 needs `@plugin "@tailwindcss/typography"` in CSS (one line)

**Verdict:** Fits the codebase perfectly. 2 new packages. No external services. Bilingual-native.

---

## Recommended architecture

### New packages (2 only)
```bash
pnpm add next-mdx-remote gray-matter --filter frontend
pnpm add -D @tailwindcss/typography --filter frontend
```

### File structure
```
frontend/
├── content/
│   └── learn/
│       ├── sw/
│       │   ├── sheria-za-drafti.mdx
│       │   ├── mikakati-ya-wanaoanza.mdx
│       │   ├── historia-ya-drafti.mdx
│       │   ├── tofauti-drafti-tanzania-vs-kimataifa.mdx
│       │   └── jinsi-ya-kucheza-mtandaoni.mdx
│       └── en/
│           ├── Tanzania-drafti-rules.mdx
│           ├── beginners-strategy.mdx
│           ├── history-of-East-Africa-drafti.mdx
│           ├── Tanzania-vs-international-rules.mdx
│           └── how-to-play-online.mdx
│
└── src/
    ├── lib/
    │   └── content.ts              ← getArticle(), getAllArticles()
    ├── components/
    │   └── mdx/
    │       ├── MdxComponents.tsx   ← custom elements (Tip, Rule, etc.)
    │       └── Prose.tsx           ← typography wrapper
    └── app/[locale]/
        └── learn/
            ├── layout.tsx
            ├── page.tsx            ← listing page
            └── [slug]/
                └── page.tsx        ← article page + generateMetadata
```

### MDX frontmatter format
Every article starts with:
```yaml
---
title: "Sheria za Drafti Tanzania"
description: "Mwongozo kamili wa sheria rasmi za Drafti ya Tanzania (TZD v2.2)"
date: "2026-03-20"
keywords: ["sheria za drafti", "drafti tanzania", "mchezo wa drafti"]
author: "TzDraft Team"
---
```

### content.ts utility
```typescript
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content/learn");

export interface ArticleMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  keywords: string[];
}

export interface Article extends ArticleMeta {
  content: string; // raw MDX source
}

export function getAllArticles(locale: string): ArticleMeta[] {
  const dir = path.join(CONTENT_DIR, locale);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data } = matter(raw);
      return { slug, ...data } as ArticleMeta;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getArticle(locale: string, slug: string): Article | null {
  const file = path.join(CONTENT_DIR, locale, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  return { slug, content, ...data } as Article;
}
```

### Article page (generateMetadata + JSON-LD)
```typescript
// app/[locale]/learn/[slug]/page.tsx
import { MDXRemote } from "next-mdx-remote/rsc";
import { getArticle, getAllArticles } from "@/lib/content";
import { MdxComponents } from "@/components/mdx/MdxComponents";
import { JsonLd } from "@/components/seo/JsonLd";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return getAllArticles(params.locale).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  const article = getArticle(params.locale, params.slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    openGraph: { type: "article", title: article.title, description: article.description },
  };
}

export default async function ArticlePage({ params }: { params: { locale: string; slug: string } }) {
  const article = getArticle(params.locale, params.slug);
  if (!article) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    inLanguage: params.locale,
    publisher: { "@type": "Organization", name: "TzDraft", url: "https://www.tzdraft.co.tz" },
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <article className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black text-white mb-4">{article.title}</h1>
        <p className="text-neutral-500 text-sm mb-10">{article.date}</p>
        <div className="prose prose-invert prose-orange max-w-none">
          <MDXRemote source={article.content} components={MdxComponents} />
        </div>
      </article>
    </>
  );
}
```

### Tailwind v4 typography (one line in globals.css)
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

### Custom MDX components
```typescript
// components/mdx/MdxComponents.tsx
import { Tip } from "./Tip";
import { Rule } from "./Rule";

export const MdxComponents = {
  Tip,        // callout box for tips
  Rule,       // highlighted rule block
  // h1, h2, a, img — can override default HTML elements too
};
```

---

## URL structure
```
/sw/learn                         ← Swahili listing
/sw/learn/sheria-za-drafti        ← Swahili article
/en/learn                         ← English listing
/en/learn/Tanzania-drafti-rules   ← English article
```

Automatically indexed by the sitemap — add `learn` to `app/sitemap.ts` by calling `getAllArticles()` for both locales.

---

## Static generation
Add `export const dynamic = "force-static"` to the article page, or use `generateStaticParams` (shown above). All articles are pre-rendered at build time — zero runtime MDX compilation in production.

---

## Implementation order
1. `pnpm add next-mdx-remote gray-matter` + `pnpm add -D @tailwindcss/typography`
2. Add `@plugin "@tailwindcss/typography"` to `globals.css`
3. Create `frontend/content/learn/sw/` and `frontend/content/learn/en/` directories
4. Write `src/lib/content.ts`
5. Build `app/[locale]/learn/page.tsx` (listing)
6. Build `app/[locale]/learn/[slug]/page.tsx` (article + metadata + JSON-LD)
7. Create `MdxComponents.tsx` with `<Tip>` and `<Rule>` at minimum
8. Write first article: **Sheria za Drafti Tanzania** (sw) + English version — highest SEO value
9. Add learn routes to `sitemap.ts`
10. Add `learn` nav link (can be added after ≥ 2 articles are published)

---

## What NOT to do
- Do not use `@next/mdx` — doesn't work cleanly with `[locale]/[slug]` dynamic routing
- Do not use Contentlayer — deprecated
- Do not pull in a headless CMS yet — content volume doesn't justify it
- Do not make article pages `"use client"` — they must be Server Components for SEO

---

## Summary
Two packages (`next-mdx-remote` + `gray-matter`), one CSS line (`@plugin "@tailwindcss/typography"`), one new directory (`content/learn/`), three new route files. Bilingual by design, fully SSR, zero external services, Article JSON-LD auto-generated from frontmatter, listing page built from filesystem. This approach is the natural extension of the existing codebase patterns and can be shipped in 1–2 days of dev work.
