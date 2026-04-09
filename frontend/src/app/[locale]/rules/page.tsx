import React from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteUrl } from "@/lib/seo";
import { client } from "@/sanity/client";
import { pageBySlugQuery } from "@/sanity/queries";
import { notFound } from "next/navigation";

interface SanityPage {
  title: { en: string; sw: string };
  lastUpdated?: { en: string; sw: string };
  sections: Array<{
    _key: string;
    title: { en: string; sw: string };
    content?: string[];
    subsections?: Array<{
      _key: string;
      title: { en: string; sw: string };
      content: string[];
    }>;
  }>;
}

export default async function RulesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isSw = locale === "sw";
  
  const page: SanityPage = await client.fetch(pageBySlugQuery, { slug: "rules" });
  if (!page) notFound();

  const title = isSw ? page.title.sw : page.title.en;
  const lastUpdated = isSw ? page.lastUpdated?.sw : page.lastUpdated?.en;
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/${locale}/rules`;

  // ── SEO Schemas ─────────────────────────────────────────────────────────
  // Note: For now we keep these manually mapped or simplified from the data.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: isSw
      ? [
          {
            "@type": "Question",
            name: "Kete za kawaida husonga vipi katika Drafti ya Tanzania?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Kete za kawaida husonga sanduku moja mbele kwa ulalo na haziruhusiwi kurudi nyuma.",
            },
          },
          {
            "@type": "Question",
            name: "Kingi husonga vipi katika Drafti ya Tanzania?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Kingi ni 'kingi huruka': husonga kwa ulalo umbali wowote na hula mbele au nyuma.",
            },
          },
        ]
      : [
          {
            "@type": "Question",
            name: "How do men move in Tanzania Drafti?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Men move one square diagonally forward and cannot move backward.",
            },
          },
        ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: isSw ? "Jinsi ya Kucheza Drafti Tanzania" : "How to Play Tanzania Drafti",
    description: isSw
      ? "Jifunze sheria rasmi za Drafti ya Tanzania: mwendo, kula lazima, kupandishwa kuwa kingi, na masharti ya ushindi."
      : "Learn the official Tanzania Drafti (8x8) rules: movement, mandatory capture, promotion, and winning conditions.",
    url: pageUrl,
    step: page.sections.slice(0, 5).map((step, i) => ({
      "@type": "HowToStep",
      name: isSw ? step.title.sw : step.title.en,
      text: isSw ? step.content?.[0] : step.content?.[0],
    })),
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={howToSchema} />
      <div className="min-h-screen bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-[#292524] rounded-2xl shadow-xl overflow-hidden border border-[#44403c]">
          <div className="bg-[#1c1917] px-8 py-6 border-b border-[#44403c]">
            <h1 className="text-3xl font-black text-[var(--primary)] uppercase tracking-wide">
              {title}
            </h1>
            {lastUpdated && <p className="mt-2 text-gray-400">{lastUpdated}</p>}
          </div>

          <div className="p-8 space-y-8 text-gray-300 leading-relaxed">
            {page.sections.map((section, idx) => (
              <React.Fragment key={section._key}>
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-[var(--primary)] text-xl">
                      {(idx + 1).toString().padStart(2, "0")}.
                    </span>{" "}
                    {isSw ? section.title.sw : section.title.en}
                  </h2>
                  
                  {section.content && (
                    <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c] mb-6">
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {section.content.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {section.subsections && (
                    <div className="grid md:grid-cols-2 gap-6">
                      {section.subsections.map((sub) => (
                        <div key={sub._key} className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
                          <h3 className="font-bold text-white mb-2">
                            {isSw ? sub.title.sw : sub.title.en}
                          </h3>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {sub.content.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                {idx < page.sections.length - 1 && (
                  <div className="h-px bg-[#44403c]" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
