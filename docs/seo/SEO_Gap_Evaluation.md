# TzDraft SEO Gap Report — Engineering Evaluation
**Date:** March 2026
**Based on:** TzDraft_SEO_Gap_Report.docx (March 2026)
**Codebase branch:** fix/prisma-client-path-and-auth-country

---

## Overview

This document evaluates each of the 7 SEO gaps identified in the external report against the **actual current state of the codebase**, then defines a concrete engineering response for each gap. Status labels:

| Label | Meaning |
|-------|---------|
| ✅ DONE | Gap is already closed in current code |
| ⚠️ PARTIAL | Framework is in place but copy/config is weak |
| ❌ MISSING | Gap is real, nothing in place |

---

## GAP 1 — Missing & Weak Meta Tags

**Report claim:** No meta description, no OG tags, no Twitter Card tags.

**Actual state: ⚠️ PARTIAL**

The report is outdated on the technical side. The codebase has:
- `generateMetadata()` in `frontend/src/app/[locale]/layout.tsx` covering all public routes
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:locale`) on all pages
- Twitter Card (`summary_large_image`) inherited across all routes
- Dynamic branded OG image at `opengraph-image.tsx` (1200×630, edge runtime)
- Canonical URLs via `alternates.canonical`

**What is actually weak:**
The meta *copy* (title + description text) is still in generic English. The report's example is better:

| | Current | Recommended |
|---|---|---|
| Title | `TzDraft - Tanzania Drafti` | `TzDraft \| Cheza Drafti Mtandaoni Tanzania — Bure Kabisa` |
| Description | `Play Tanzania Drafti (8x8) online. Learn the rules, practice vs AI...` | `Cheza Drafti mtandaoni na marafiki au dhidi ya AI. Jisajili bure leo na jiunge na zaidi ya wachezaji 500 kila siku Tanzania.` |

**Response — 1 day dev effort:**
- [ ] Update the default `description` in `[locale]/layout.tsx` to use the Swahili copy for the `sw` locale and keep a strong English version for `en`
- [ ] Add `generateMetadata` to individual pages (not just layouts) so each page has a unique, targeted title and description
- [ ] Ensure `/play` page targets keyword "cheza drafti na kompyuta" — current description is too generic
- [ ] Verify the OG image actually loads: check `NEXT_PUBLIC_SITE_URL` is set in production env

---

## GAP 2 — Untapped Local & Swahili Keyword Opportunity

**Report claim:** Swahili content JS-rendered and uncrawlable; no Tanzania local SEO.

**Actual state: ⚠️ PARTIAL**

**What is already good:**
- `next-intl` is fully configured with Swahili as the *default* locale
- `[locale]/layout.tsx` is an async **Server Component** — metadata is SSR'd
- `hreflang` is implemented via `alternates.languages` in metadata (Next.js renders `<link rel="alternate">` tags)
- URL structure is correct: `/sw/...` and `/en/...`

**What is actually weak:**
- Almost all *content pages* (`/play`, `/rules`, `/policy`, homepage) use `"use client"` — the visible text is rendered by JavaScript. Googlebot *may* wait for JS hydration, but it is not guaranteed on every crawl, especially on slower origin servers
- The Swahili translation strings for the homepage hero (`useTranslations('hero')`) are served client-side; a user searching for "drafti mtandaoni" will not find that text in the HTML source
- No Google Business Profile (non-code — marketing task)
- No `LocalBusiness` schema with Tanzania location data

**Response — 2–3 day dev effort:**
- [ ] Convert `frontend/src/app/[locale]/page.tsx` (homepage) from `"use client"` to a **Server Component** (or use React Server Component for the static hero section + client boundary for the stats counter only). This is the single most impactful technical change
- [ ] Same for `rules/page.tsx` and `policy/page.tsx` — these are purely static content, there is no reason for `"use client"`
- [ ] Add `LocalBusiness` JSON-LD schema (see GAP 4 below) with `addressCountry: "TZ"`
- [ ] Confirm `NEXT_PUBLIC_SITE_URL=https://www.tzdraft.co.tz` so canonical/hreflang URLs are absolute and correct

---

## GAP 3 — No Content Strategy (Blog / Guides)

**Report claim:** No written content, no rules page, no articles, Google has nothing to index.

**Actual state: ❌ MISSING (with one exception)**

A `/rules` route exists but it is currently a thin UI page. No blog section, no dedicated articles, no "Learn" content.

**Priority content pages to build (in order):**

| # | Slug | Swahili Title | Primary Keyword | Effort |
|---|------|---------------|-----------------|--------|
| 1 | `/rules` (expand) | Sheria za Drafti Tanzania | sheria za drafti | 2 days |
| 2 | `/learn/beginner-strategy` | Mikakati ya Drafti kwa Wanaoanza | mikakati ya drafti | 3 days |
| 3 | `/learn/history` | Historia ya Drafti Afrika Mashariki | historia ya drafti | 2 days |
| 4 | `/learn/vs-international` | Tofauti kati ya Drafti ya Tanzania na Kimataifa | drafti tanzania vs kimataifa | 2 days |
| 5 | `/learn/how-to-play-online` | Jinsi ya Kucheza Drafti Mtandaoni | jinsi ya kucheza drafti | 2 days |

**Response — 1–2 weeks effort:**
- [ ] Create `frontend/src/app/[locale]/learn/` directory with a layout and individual article pages
- [ ] All learn pages must be **Server Components** (static MDX or inline JSX) so Google can read every word without JS
- [ ] Add `Article` JSON-LD schema to each learn page
- [ ] Expand the existing `/rules` page with full TZD rule text (we have it in `docs/official_game_rule/`) — this is zero-competition territory
- [ ] Add a "Learn" nav link once the section has at least 2 articles

---

## GAP 4 — No Structured Data (Schema Markup)

**Report claim:** No JSON-LD of any kind.

**Actual state: ❌ MISSING — confirmed**

Nothing in the codebase generates `<script type="application/ld+json">`.

**Schemas to implement and where:**

| Schema | Page | Priority | What it unlocks |
|--------|------|----------|-----------------|
| `Organization` | Root layout | HIGH | Knowledge Panel for "TzDraft" brand searches |
| `VideoGame` / `Game` | Homepage | HIGH | Rich results for game-related queries |
| `FAQPage` | `/rules` | MEDIUM | FAQ rich results in SERP |
| `BreadcrumbList` | All inner pages | MEDIUM | Breadcrumb display in SERP |
| `Article` | `/learn/*` pages | MEDIUM | Article rich results |
| `WebSite` + `SearchAction` | Root layout | LOW | Sitelinks search box |

**Response — 1 day dev effort:**

Create `frontend/src/components/seo/JsonLd.tsx`:
```tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

Add to root locale layout:
```tsx
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TzDraft",
  url: "https://www.tzdraft.co.tz",
  logo: "https://www.tzdraft.co.tz/logo/logo.png",
  description: "Tanzania's online Drafti gaming platform",
  address: { "@type": "PostalAddress", addressCountry: "TZ" },
  sameAs: ["https://www.facebook.com/tzdraft"] // add when available
};

const gameSchema = {
  "@context": "https://schema.org",
  "@type": "Game",
  name: "TzDraft — Drafti Mtandaoni",
  description: "Cheza Drafti mtandaoni Tanzania",
  url: "https://www.tzdraft.co.tz",
  numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2 },
  gamePlatform: "Web Browser",
  inLanguage: ["sw", "en"],
  countryOfOrigin: { "@type": "Country", name: "Tanzania" }
};
```

---

## GAP 5 — Technical SEO Deficiencies

**Report claim:** No sitemap, no robots.txt, no hreflang, no canonical tags.

**Actual state: ✅ MOSTLY DONE — report was based on an older snapshot**

| Technical Item | Status | File |
|----------------|--------|------|
| `sitemap.xml` | ✅ Done | `app/sitemap.ts` — programmatic, covers 10 URLs |
| `robots.txt` | ✅ Done | `app/robots.ts` — disallows auth/game routes |
| `hreflang` | ✅ Done | Via `alternates.languages` in metadata |
| Canonical tags | ✅ Done | Via `alternates.canonical` per page |
| SSR for key content | ⚠️ Partial | See GAP 2 — content pages are `"use client"` |
| Admin noindex | ❌ Missing | `/admin/*` not in robots.ts disallow list |

**Response — 2 hours dev effort:**
- [ ] Add `/sw/admin/` and `/en/admin/` to the `disallow` list in `app/robots.ts`
- [ ] Submit `https://www.tzdraft.co.tz/sitemap.xml` to **Google Search Console** (non-code — one-time task)
- [ ] Submit to **Bing Webmaster Tools** (non-code — one-time task)
- [ ] Verify sitemap renders correctly in production (no localhost URLs leaking from `getSiteUrl()`)

---

## GAP 6 — No Local Backlink Authority

**Report claim:** No inbound links from Tanzanian sites.

**Actual state: ❌ MISSING — non-code gap**

This cannot be fixed in the codebase. It is a marketing and outreach task.

**Recommended engineering support actions:**
- [ ] Add a `Press / About` page (`/about`) with a downloadable press kit (logo, screenshots, one-paragraph description) — makes it easy for journalists to cover the platform
- [ ] Ensure the homepage includes a clear "Made in Tanzania" signal (flag, location, `.co.tz` domain prominent) to help local tech journalists contextualise the story
- [ ] Generate shareable deep links for invite games (`/game/invite/[code]`) — these circulate in WhatsApp groups and create organic social backlinks

**Non-code actions (team responsibility):**
- Pitch to TechMoran, Bongo Tech, and Jamii Forums
- Contact UDSM and Ardhi University ICT/gaming clubs
- Submit to Tanzania sports and gaming directories
- Create a Facebook Page and pin the invite-game URL

---

## GAP 7 — Page Performance & Core Web Vitals

**Report claim:** Slow LCP, no CDN edge nodes in Africa, live stats API blocks render.

**Actual state: ⚠️ PARTIAL — risk is real but extent unknown**

**What is good:**
- Next.js with App Router uses automatic code splitting and streaming
- `next/image` is used for images (provides automatic WebP and lazy loading)
- Sentry integration is present and will surface real user monitoring data

**What is at risk:**
- The homepage is `"use client"` — the entire React tree is hydrated on load, delaying interactivity
- The live player count (`124 Players Online`) makes an API call on render — if slow, it delays LCP
- Hosting location is unknown from code; if served from Europe, TTFB for Dar es Salaam users may be 200–400ms

**Response — 1–3 day dev effort:**
- [ ] Move homepage to Server Component (also fixes GAP 2). Keep only the stats counter as a client component wrapped in `<Suspense>` so it does not block initial render
- [ ] Add `priority` prop to the hero logo/image in `frontend/src/app/[locale]/page.tsx` (this is the most impactful single-line LCP fix)
- [ ] Defer the online-player-count fetch: render `--` as placeholder, hydrate async
- [ ] Run `next build && next start` locally then use `lighthouse` CLI on the production URL targeting mobile — target score ≥ 80
- [ ] Infrastructure: evaluate Cloudflare (free tier has Nairobi/Johannesburg PoPs). This is the most impactful TTFB fix for Tanzanian mobile users

---

## Consolidated Priority Action Plan

Mapped to engineering effort, ordered by impact:

| # | Action | Gap | Effort | Owner |
|---|--------|-----|--------|-------|
| 1 | Update meta copy (title + description) to Swahili in `sw` locale | GAP 1 | 2h | FE dev |
| 2 | Submit sitemap to Google Search Console + Bing | GAP 5 | 1h | Any |
| 3 | Convert homepage, rules, policy to Server Components | GAP 2, 7 | 2d | FE dev |
| 4 | Add `Organization` + `Game` JSON-LD to root layout | GAP 4 | 4h | FE dev |
| 5 | Add `priority` to hero image | GAP 7 | 30min | FE dev |
| 6 | Add admin disallow to robots.ts | GAP 5 | 30min | FE dev |
| 7 | Expand `/rules` page with full TZD rule text + FAQPage schema | GAP 3, 4 | 2d | FE dev |
| 8 | Build `/learn/` section with 3 articles (rules, beginner strategy, history) | GAP 3 | 1–2w | FE dev + writer |
| 9 | Add `Article` JSON-LD to each learn page | GAP 4 | 1h each | FE dev |
| 10 | Add `BreadcrumbList` schema to inner pages | GAP 4 | 4h | FE dev |
| 11 | Set up Cloudflare in front of origin | GAP 7 | 1d | DevOps |
| 12 | Create `/about` press page | GAP 6 | 4h | FE dev |
| 13 | Outreach to Tanzanian tech media + universities | GAP 6 | ongoing | Team |

---

## What the Report Got Wrong

The report was clearly generated from a crawl-level analysis (HTML source, no build inspection). It missed several things that are already implemented:

- **OG + Twitter metadata IS present** — the report says it is missing
- **robots.txt IS present** via `app/robots.ts` (Next.js programmatic file convention)
- **sitemap.xml IS present** via `app/sitemap.ts`
- **hreflang IS present** via Next.js metadata `alternates`
- **Canonical tags ARE present** per page

The genuine gaps are: **JSON-LD structured data** (fully missing), **Swahili content SSR** (client-side pages), **content/blog section** (no learn articles), and **performance optimisation** (client-heavy homepage).

---

## Estimated Impact If All Actions Completed

| Metric | Current (est.) | After 30 days | After 90 days |
|--------|---------------|---------------|---------------|
| Indexed pages | ~10 | ~10 (same, but correctly crawled) | ~20+ with learn section |
| Ranking for "drafti mtandaoni" | Not ranking | Page 2–3 | Page 1 |
| Ranking for "sheria za drafti" | Not ranking | Page 1–2 | #1 |
| SERP appearance | Plain blue link | With OG description | Rich result with FAQ |
| WhatsApp link preview | Branded image ✅ (already working) | — | — |
| LCP mobile score | Unknown | Likely improved | Target ≥ 80 |

---

*Prepared by: Engineering review of TzDraft codebase | March 2026*
