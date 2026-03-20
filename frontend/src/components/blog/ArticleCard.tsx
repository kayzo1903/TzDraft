import { Link } from "@/i18n/routing";
import { Calendar, Star } from "lucide-react";

interface ArticleCardProps {
  slug: string;
  title: { sw?: string; en?: string };
  description?: { sw?: string; en?: string };
  publishedAt?: string;
  coverImageUrl?: string;
  featured?: boolean;
  author?: string;
  category?: { slug: string; title: { sw?: string; en?: string } } | null;
  locale: string;
  variant?: "default" | "featured";
}

export function ArticleCard({
  slug,
  title,
  description,
  publishedAt,
  coverImageUrl,
  featured,
  author,
  category,
  locale,
  variant = "default",
}: ArticleCardProps) {
  const t   = locale === "sw" ? (title.sw   || title.en)       : (title.en   || title.sw);
  const d   = locale === "sw" ? description?.sw                : description?.en;
  const cat = locale === "sw" ? category?.title.sw             : category?.title.en;

  let formattedDate: string | null = null;
  if (publishedAt) {
    try {
      formattedDate = new Date(publishedAt).toLocaleDateString(
        locale === "sw" ? "sw-TZ" : "en-TZ",
        { year: "numeric", month: "long", day: "numeric" },
      );
    } catch {
      formattedDate = new Date(publishedAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
    }
  }

  if (variant === "featured") {
    return (
      <Link href={`/learn/${slug}`}>
        <article className="group relative flex flex-col sm:flex-row rounded-2xl border border-[var(--primary)]/30 bg-[var(--secondary)]/60 hover:bg-[var(--secondary)] overflow-hidden transition-all duration-200 cursor-pointer">
          {/* Image */}
          <div className="sm:w-2/5 h-56 sm:h-auto overflow-hidden shrink-0">
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt={t || ""}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-[var(--primary)]/10 flex items-center justify-center">
                <span className="text-6xl">♟</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-4 p-7 flex-1 justify-center">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2.5 py-1 rounded-full">
                <Star className="w-3 h-3 fill-[var(--primary)]" />
                {locale === "sw" ? "Makala Maarufu" : "Featured"}
              </span>
              {cat && (
                <span className="text-xs text-neutral-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                  {cat}
                </span>
              )}
            </div>

            <h2 className="font-black text-2xl text-white leading-snug group-hover:text-[var(--primary)] transition-colors">
              {t}
            </h2>

            {d && (
              <p className="text-sm text-neutral-400 leading-relaxed line-clamp-3">{d}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-neutral-600 mt-auto flex-wrap">
              {formattedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formattedDate}
                </span>
              )}
              {author && <span>· {author}</span>}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/learn/${slug}`}>
      <article className="group flex flex-col rounded-2xl border border-white/10 bg-[var(--secondary)]/40 hover:bg-[var(--secondary)] hover:border-[var(--primary)]/30 overflow-hidden transition-all duration-200 hover:scale-[1.01] cursor-pointer h-full">
        {/* Cover */}
        <div className="h-44 overflow-hidden shrink-0">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={t || ""}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-[var(--primary)]/10 flex items-center justify-center">
              <span className="text-4xl">♟</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-2 flex-1">
          {(featured || cat) && (
            <div className="flex items-center gap-2 flex-wrap">
              {featured && (
                <Star className="w-3.5 h-3.5 text-[var(--primary)] fill-[var(--primary)]" />
              )}
              {cat && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {cat}
                </span>
              )}
            </div>
          )}

          <h2 className="font-black text-base text-white leading-snug group-hover:text-[var(--primary)] transition-colors">
            {t}
          </h2>

          {d && (
            <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">{d}</p>
          )}

          <div className="flex items-center gap-2 text-[11px] text-neutral-600 mt-auto pt-2 flex-wrap">
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </span>
            )}
            {author && <span>· {author}</span>}
          </div>
        </div>
      </article>
    </Link>
  );
}
