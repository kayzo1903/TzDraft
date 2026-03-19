# SEO-EVALUATION REPORT

**Project:** TzDraft  
**Date:** March 18, 2026  
**Evaluator:** Codex engineering review

## Executive Summary

TzDraft has a solid technical SEO base, but the overall SEO strategy is still underpowered for organic growth.

The codebase already includes:
- Programmatic sitemap generation
- Programmatic robots rules
- Canonical URLs
- `hreflang` alternates for Swahili and English
- Localized homepage metadata
- Root-level structured data for `Organization` and `Game`

The main weaknesses are:
- Public page metadata is not consistently localized by route
- There is no real SEO content hub for non-branded discovery
- FAQ, article, and breadcrumb schema are missing
- Some text has encoding issues that could affect quality signals and snippets
- Some public content, especially support, is still client-rendered

## Overall Rating

| Area | Rating | Notes |
|------|--------|-------|
| Technical SEO | 7/10 | Strong base: sitemap, robots, canonicals, hreflang, base schema |
| On-page SEO | 4/10 | Key route metadata is generic and not locale-specific |
| Content Strategy | 2/10 | No `/learn` or article system for search expansion |
| Local SEO | 4/10 | Tanzania positioning exists in copy/schema, but little supporting content |
| Overall | 4.5/10 | Good foundation, weak growth engine |

## What Is Working Well

### 1. Canonical and alternate language setup

The project has a clean SEO utility layer in `frontend/src/lib/seo.ts` that:
- Normalizes the production site URL
- Generates canonical URLs
- Generates language alternates for `sw`, `en`, and `x-default`

This is a strong implementation for multilingual indexing.

### 2. Sitemap and robots are already implemented

The project includes:
- `frontend/src/app/sitemap.ts`
- `frontend/src/app/robots.ts`

These already cover the main public routes and correctly block:
- auth pages
- game routes
- admin routes

This means the site is not missing technical crawl controls.

### 3. Homepage metadata is much better than a basic setup

The locale layout in `frontend/src/app/[locale]/layout.tsx` includes:
- localized homepage title and description
- Open Graph metadata
- Twitter card metadata
- canonical URL
- language alternates

This is a meaningful strength and gives the homepage a reasonable branded SEO base.

### 4. Root structured data exists

The same locale layout already injects JSON-LD for:
- `Organization`
- `Game`

That closes one of the older SEO gaps that would normally appear in a basic crawl audit.

## Key Weaknesses

### 1. Page-level metadata is not fully localized

The homepage metadata is localized, but route layouts for important public pages are still generic English:
- `frontend/src/app/[locale]/play/layout.tsx`
- `frontend/src/app/[locale]/rules/layout.tsx`
- `frontend/src/app/[locale]/policy/layout.tsx`
- `frontend/src/app/[locale]/support/layout.tsx`

This weakens the Swahili SEO strategy because the page language and the metadata language are not consistently aligned.

Examples:
- `/sw/play` still uses an English title and description
- `/sw/rules` still uses an English title and description

This means `hreflang` exists technically, but the route-level search targeting is still incomplete.

### 2. The content strategy is too thin

The sitemap currently exposes only a very small set of public pages:
- homepage
- play
- rules
- policy
- support

There is no discoverable content section such as:
- `/learn`
- strategy guides
- rules explainers
- history pages
- beginner tutorials

This is the biggest strategic SEO problem. Without evergreen content, TzDraft will struggle to rank for non-branded searches like:
- `sheria za drafti`
- `jinsi ya kucheza drafti`
- `drafti mtandaoni`
- `drafti strategy`

### 3. Structured data is incomplete at the page level

Although root JSON-LD exists, the site does not appear to implement:
- `FAQPage`
- `BreadcrumbList`
- `Article`

This matters because:
- the support page already contains FAQ content
- the rules page could support FAQ markup
- future content pages should qualify for article rich results

Right now, rich-result potential is underused.

### 4. Encoding issues reduce quality

Several files contain mojibake or broken character rendering such as:
- `â€”`
- `8Ã—8`

These appear in metadata and visible content. Even if browsers partially recover them, they create avoidable quality issues in:
- titles
- descriptions
- page copy
- potentially search snippets

This should be treated as a real SEO cleanup task.

### 5. Some public content is still client-rendered

The homepage, rules page, and policy page are server-rendered now, which is good.

However, the support page is still a client component:
- `frontend/src/app/[locale]/support/page.tsx`

That page includes FAQ content that could be indexed more reliably if the static content were server-rendered and the contact form were isolated behind a client boundary.

## Strategic Assessment

### Current strategy type

The current SEO strategy is mostly:
- technical hygiene
- branded discovery
- basic multilingual setup

It is not yet a strong:
- content-led SEO strategy
- local-intent SEO strategy
- long-tail search acquisition strategy

### What this means in practice

TzDraft is reasonably prepared to support SEO, but it is not yet publishing enough search-targeted content to grow meaningfully through Google.

At the moment, the site is more likely to benefit from:
- branded searches for `TzDraft`
- shared links and social previews
- direct traffic

Than from:
- informational queries
- local rules searches
- beginner learning searches
- strategy or tutorial searches

## Priority Recommendations

### High Priority

1. Localize metadata for every public route
   - Add Swahili and English route-specific titles/descriptions for:
   - `/play`
   - `/rules`
   - `/policy`
   - `/support`

2. Fix encoding issues across metadata and visible copy
   - Replace broken punctuation and corrupted characters
   - Verify files are saved with UTF-8 encoding

3. Add `FAQPage` schema
   - Best starting points:
   - support page
   - rules page

4. Move support page SEO content to server rendering
   - Keep the form interactive via a client subcomponent if needed

### Medium Priority

5. Create a real content hub
   - Recommended section: `/learn`
   - First topics:
   - `Sheria za Drafti Tanzania`
   - `Jinsi ya Kucheza Drafti Mtandaoni`
   - `Mikakati ya Drafti kwa Wanaoanza`
   - `Historia ya Drafti Afrika Mashariki`

6. Add `BreadcrumbList` schema to inner pages

7. Expand internal linking
   - Add visible links to rules, support, and future learn pages from the homepage and play page

### Lower Priority but Valuable

8. Add `Article` schema for future guides

9. Build an About or Press page
   - This helps trust, backlinks, and local authority

10. Support off-site SEO work
   - Google Search Console submission
   - Bing Webmaster Tools submission
   - local backlink outreach in Tanzania

## Recommended 30-Day Plan

### Week 1

- Fix encoding issues
- Localize all public metadata
- Verify canonical and alternate URLs in production

### Week 2

- Add `FAQPage` schema to support and rules
- Refactor support page so FAQ content is server-rendered

### Week 3

- Launch `/learn`
- Publish at least 2 high-intent pages in Swahili first

### Week 4

- Add article schema and breadcrumbs
- Submit sitemap to search engines
- Measure indexed pages and impressions in Search Console

## Final Verdict

TzDraft is not failing at SEO fundamentals. The technical foundation is already stronger than many early-stage products.

The real problem is that the current strategy stops at setup. It has the infrastructure for SEO, but not yet the content depth, localized route targeting, and page-specific schema needed to compete for meaningful organic traffic.

In short:
- the technical SEO base is good
- the strategic SEO depth is still weak
- the biggest growth unlock is content plus localized page targeting

## Files Reviewed

- `frontend/src/lib/seo.ts`
- `frontend/src/app/sitemap.ts`
- `frontend/src/app/robots.ts`
- `frontend/src/app/[locale]/layout.tsx`
- `frontend/src/app/[locale]/page.tsx`
- `frontend/src/app/[locale]/play/layout.tsx`
- `frontend/src/app/[locale]/rules/layout.tsx`
- `frontend/src/app/[locale]/policy/layout.tsx`
- `frontend/src/app/[locale]/support/layout.tsx`
- `frontend/src/app/[locale]/support/page.tsx`
- `frontend/messages/sw.json`
- `frontend/messages/en.json`
