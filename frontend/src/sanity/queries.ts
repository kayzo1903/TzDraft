import { groq } from "next-sanity";

// All articles — listing page (metadata only, no body)
export const allArticlesQuery = groq`
  *[_type == "article"] | order(featured desc, publishedAt desc) {
    "slug": slug.current,
    title,
    description,
    publishedAt,
    featured,
    author,
    "coverImageUrl": coverImage.asset->url,
    "category": category->{ "slug": slug.current, title },
  }
`;

// Single article by slug — full content (resolves image URLs inside body)
export const articleBySlugQuery = groq`
  *[_type == "article" && slug.current == $slug][0] {
    "slug": slug.current,
    title,
    description,
    keywords,
    publishedAt,
    author,
    "coverImageUrl": coverImage.asset->url,
    "category": category->{ "slug": slug.current, title },
    body {
      sw[] {
        ...,
        _type == "image" => { ..., "asset": asset->{ url } }
      },
      en[] {
        ...,
        _type == "image" => { ..., "asset": asset->{ url } }
      }
    },
  }
`;

// All slugs — for generateStaticParams
export const allSlugsQuery = groq`
  *[_type == "article"] { "slug": slug.current }
`;

// All categories
export const allCategoriesQuery = groq`
  *[_type == "category"] | order(title.en asc) {
    "slug": slug.current,
    title,
  }
`;

// Single static page by slug (Rules, Policy, etc.)
export const pageBySlugQuery = groq`
  *[_type == "page" && slug.current == $slug][0] {
    "slug": slug.current,
    title,
    lastUpdated,
    sections[] {
      ...,
      body {
        sw[] { ..., _type == "image" => { ..., "asset": asset->{ url } } },
        en[] { ..., _type == "image" => { ..., "asset": asset->{ url } } }
      }
    }
  }
`;

// All playbook tactics
export const allTacticsQuery = groq`
  *[_type == "tactic"] | order(title asc) {
    "slug": slug.current,
    title,
    description,
    difficulty
  }
`;
