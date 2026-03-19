"use client";

import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/react";

type Locale = "sw" | "en";

function buildComponents(locale: Locale) {
  return {
    block: {
      h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="text-2xl font-bold text-white mt-10 mb-3">{children}</h2>
      ),
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="text-xl font-bold text-white mt-7 mb-2">{children}</h3>
      ),
      h4: ({ children }: { children?: React.ReactNode }) => (
        <h4 className="text-lg font-bold text-white mt-5 mb-1">{children}</h4>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="border-l-4 border-primary pl-5 my-6 text-neutral-400 italic">
          {children}
        </blockquote>
      ),
      normal: ({ children }: { children?: React.ReactNode }) => (
        <p className="text-neutral-300 leading-relaxed mb-4">{children}</p>
      ),
    },
    marks: {
      strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-bold text-white">{children}</strong>
      ),
      em: ({ children }: { children?: React.ReactNode }) => (
        <em className="italic text-neutral-200">{children}</em>
      ),
      underline: ({ children }: { children?: React.ReactNode }) => (
        <span className="underline underline-offset-2">{children}</span>
      ),
      link: ({
        value,
        children,
      }: {
        value?: { href?: string; blank?: boolean };
        children?: React.ReactNode;
      }) => (
        <a
          href={value?.href}
          target={value?.blank ? "_blank" : undefined}
          rel={value?.blank ? "noopener noreferrer" : undefined}
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {children}
        </a>
      ),
    },
    list: {
      bullet: ({ children }: { children?: React.ReactNode }) => (
        <ul className="list-disc list-inside space-y-1 mb-4 text-neutral-300">{children}</ul>
      ),
      number: ({ children }: { children?: React.ReactNode }) => (
        <ol className="list-decimal list-inside space-y-1 mb-4 text-neutral-300">{children}</ol>
      ),
    },
    types: {
      image: ({
        value,
      }: {
        value: { asset?: { url?: string }; alt?: string; caption?: string };
      }) => (
        <figure className="my-8">
          {value.asset?.url && (
            <img
              src={value.asset.url}
              alt={value.alt || ""}
              className="rounded-xl w-full object-cover"
            />
          )}
          {value.caption && (
            <figcaption className="text-center text-neutral-500 text-sm mt-2">
              {value.caption}
            </figcaption>
          )}
        </figure>
      ),
      callout: ({
        value,
      }: {
        value: { type?: "tip" | "rule" | "warning"; sw?: string; en?: string };
      }) => {
        const styles = {
          tip:     { icon: "💡", border: "border-blue-500/40",            bg: "bg-blue-500/10",            text: "text-blue-300"    },
          rule:    { icon: "📋", border: "border-[var(--primary)]/40",    bg: "bg-[var(--primary)]/10",    text: "text-orange-300"  },
          warning: { icon: "⚠️", border: "border-yellow-500/40",          bg: "bg-yellow-500/10",          text: "text-yellow-300"  },
        };
        const s = styles[value.type ?? "tip"];
        // Use locale to pick the correct language; fall back to the other if missing
        const content =
          locale === "sw"
            ? (value.sw || value.en)
            : (value.en || value.sw);
        return (
          <div className={`my-6 rounded-xl border ${s.border} ${s.bg} px-5 py-4 flex gap-3`}>
            <span className="text-xl shrink-0">{s.icon}</span>
            <p className={`${s.text} text-sm leading-relaxed`}>{content}</p>
          </div>
        );
      },
    },
  };
}

export function ArticleBody({
  body,
  locale,
}: {
  body: PortableTextBlock[];
  locale: Locale;
}) {
  return <PortableText value={body} components={buildComponents(locale)} />;
}
