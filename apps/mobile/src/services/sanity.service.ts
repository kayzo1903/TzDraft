import axios from "axios";

const SANITY_PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID || "wvztgicc";
const SANITY_DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET || "production";
const SANITY_API_VERSION = "2026-03-18";

const BASE_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_PROJECT_ID === "wvztgicc" ? "2021-10-21" : SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

export interface SanityArticle {
  slug: string;
  title: { sw?: string; en?: string };
  description?: { sw?: string; en?: string };
  publishedAt?: string;
  coverImageUrl?: string;
  author?: string;
}

export interface SanityTactic {
  slug: string;
  title: string;
  description: { sw?: string; en?: string };
  difficulty: "beginner" | "intermediate" | "pro";
}

export const fetchArticles = async (): Promise<SanityArticle[]> => {
  const query = encodeURIComponent(`
    *[_type == "article"] | order(featured desc, publishedAt desc) {
      "slug": slug.current,
      title,
      description,
      publishedAt,
      author,
      "coverImageUrl": coverImage.asset->url
    }
  `);
  
  try {
    const response = await axios.get(`${BASE_URL}?query=${query}`);
    return response.data.result || [];
  } catch (error) {
    console.error("[SanityService] Error fetching articles:", error);
    return [];
  }
};

export const fetchTactics = async (): Promise<SanityTactic[]> => {
  const query = encodeURIComponent(`
    *[_type == "tactic"] | order(title asc) {
      "slug": slug.current,
      title,
      description,
      difficulty
    }
  `);
  
  try {
    const response = await axios.get(`${BASE_URL}?query=${query}`);
    return response.data.result || [];
  } catch (error) {
    console.error("[SanityService] Error fetching tactics:", error);
    return [];
  }
};
