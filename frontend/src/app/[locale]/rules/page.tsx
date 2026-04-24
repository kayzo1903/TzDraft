import React from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteUrl, buildPageMetadata, isAppLocale } from "@/lib/seo";
import { client } from "@/sanity/client";
import { pageBySlugQuery } from "@/sanity/queries";
import { notFound } from "next/navigation";
import { ShieldCheck, FileText } from "lucide-react";
import { RulesTabs } from "@/components/rules/RulesTabs";
import { TournamentRulesSection } from "@/components/rules/TournamentRulesSection";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};

  const isSw = locale === "sw";
  
  return buildPageMetadata({
    locale,
    path: "/rules",
    title: isSw 
      ? "Sheria na Viwango Rasmi vya Drafti ya Tanzania (TZD)" 
      : "Official Tanzania Drafti Rules & Tournament Standards (TZD)",
    description: isSw
      ? "Soma sheria rasmi za Drafti ya Tanzania 8x8, ikiwa ni pamoja na miongozo ya mashindano ya mtoano na ligi, ula ni lazima, na kingi huruka."
      : "Access the official Tanzania Drafti 8x8 rules, including tournament knockout & league standards, mandatory capture, and flying king rules.",
    keywords: [
      "Tanzania Drafti rules", "TZD standards", "Draughts 8x8 rules", "Sheria za Drafti", 
      "TZD Federation", "Mtoano rules", "Drafti ya Tanzania"
    ],
  });
}

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

  // ── Render General Rules Content from CMS ─────────────────────────────
  const generalRulesContent = (
    <div className="space-y-8 text-gray-300 leading-relaxed animate-in fade-in duration-500">
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
              <div className="bg-secondary/40 p-5 rounded-lg border border-white/5 mb-6 shadow-inner">
                <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80">
                  {section.content.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {section.subsections && (
              <div className="grid md:grid-cols-2 gap-6">
                {section.subsections.map((sub) => (
                  <div key={sub._key} className="bg-secondary/40 p-5 rounded-lg border border-white/5 transition-colors hover:border-primary/30">
                    <h3 className="font-bold text-foreground mb-2">
                      {isSw ? sub.title.sw : sub.title.en}
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80">
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
            <div className="h-px bg-white/5" />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ── SEO Schemas ─────────────────────────────────────────────────────────
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
              text: "Kete za kawaida husonga sanduku moja mbele kwa ulalo pekee. Haziruhusiwi kurudi nyuma wala kula nyuma.",
            },
          },
          {
            "@type": "Question",
            name: "Kingi vs Kingi ni sare katika Drafti ya Tanzania?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Ndiyo, katika toleo la v2.4, mchezo wa Kingi mmoja dhidi ya Kingi mmoja ni sare ya papo hapo (insufficient material).",
            },
          },
          {
            "@type": "Question",
            name: "Je, ninaweza kuchagua kula kete chache badala ya nyingi?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Ndiyo, Drafti ya Tanzania hutumia mfumo wa 'Free Choice'. Unaweza kuchagua ula wowote halali bila kujali idadi ya kete.",
            },
          },
        ]
      : [
          {
            "@type": "Question",
            name: "How do men move and capture in Tanzania Drafti?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Men move one square diagonally forward only. They can NEVER move or capture backward under any circumstances.",
            },
          },
          {
            "@type": "Question",
            name: "Is King vs King a draw in TzDraft?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, per official TZD v2.4 rules, a 1-King vs 1-King position is an immediate draw due to insufficient material.",
            },
          },
          {
            "@type": "Question",
            name: "What is the 'Free Choice' capture rule?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "In Tanzania Drafti, if multiple capture sequences are available, you may choose any legal sequence regardless of the number or quality of pieces captured.",
            },
          },
        ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: isSw ? "Jinsi ya Kucheza Drafti Tanzania" : "How to Play Tanzania Drafti",
    description: isSw
      ? "Jifunze sheria rasmi za Drafti ya Tanzania: mwendo, ula ni lazima, na masharti ya ushindi."
      : "Learn the official Tanzania Drafti rules: movement, mandatory capture, and winning conditions.",
    url: pageUrl,
    step: [
      {
        "@type": "HowToStep",
        name: isSw ? "Kupanga Ubao" : "Setup the Board",
        text: isSw ? "Weka kete 12 kwenye sanduku nyeusi za mistari mitatu ya kwanza." : "Place 12 pieces on the dark squares of the first three rows.",
      },
      {
        "@type": "HowToStep",
        name: isSw ? "Mwendo wa Kete" : "Movement",
        text: isSw ? "Kete husonga mbele kwa ulalo sanduku moja pekee." : "Pieces move one square diagonally forward only.",
      },
      {
        "@type": "HowToStep",
        name: isSw ? "Ula ni Lazima" : "Mandatory Capture",
        text: isSw ? "Ikiwa kuna nafasi ya kula kete ya mpinzani, ni lazima ule." : "If a capture is possible, it is mandatory to take it.",
      },
    ],
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={howToSchema} />
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-secondary rounded-2xl shadow-2xl overflow-hidden border border-white/5">
          {/* Page Header */}
          <div className="bg-secondary/50 px-8 py-10 border-b border-white/5 relative overflow-hidden">
            {/* Subtle savanna accent glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                <ShieldCheck className="w-3 h-3" />
                {isSw ? "Kiwango Rasmi" : "Official Standard"}
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400">
                <FileText className="w-3 h-3" />
                TZD-8x8-v1
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-foreground uppercase tracking-tight relative z-10">
              {isSw ? "Sheria na" : "Rules &"}{" "}
              <span className="text-primary">{isSw ? "Viwango" : "Standards"}</span>
            </h1>
            {lastUpdated && (
              <p className="mt-3 text-foreground/40 font-medium relative z-10 text-sm italic">
                {lastUpdated}
              </p>
            )}
          </div>

          <div className="p-6 md:p-10">
            <RulesTabs 
              labels={{
                general: isSw ? "Sheria za Kawaida" : "General Game Rules",
                tournament: isSw ? "Sheria za Mashindano" : "Tournament & League Rules"
              }}
              generalContent={generalRulesContent}
              tournamentContent={<TournamentRulesSection locale={locale} />}
            />
          </div>
        </div>
      </div>
    </>
  );
}
