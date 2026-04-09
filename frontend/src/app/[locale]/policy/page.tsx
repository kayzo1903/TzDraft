import React from "react";
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
    body?: { en: any; sw: any };
  }>;
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isSw = locale === "sw";

  const page: SanityPage = await client.fetch(pageBySlugQuery, { slug: "policy" });
  if (!page) notFound();

  const title = isSw ? page.title.sw : page.title.en;
  const lastUpdated = isSw ? page.lastUpdated?.sw : page.lastUpdated?.en;

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-[#292524] rounded-2xl shadow-xl overflow-hidden border border-[#44403c]">
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
                  <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c] space-y-2">
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {section.content.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {idx < page.sections.length - 1 && (
                <div className="h-px bg-[#44403c]" />
              )}
            </React.Fragment>
          ))}

          <section className="text-center pt-8">
            <h2 className="text-xl font-bold text-white mb-2">
              {isSw ? "Mawasiliano na Msaada" : "Contact & Support"}
            </h2>
            <p>
              {isSw 
                ? "Kwa maswali au kuripoti ukiukwaji, wasiliana na msaada." 
                : "For questions or to report a violation, contact support."}
            </p>
            <a
              href="mailto:support@tzdraft.com"
              className="text-[var(--primary)] hover:underline mt-2 inline-block"
            >
              support@tzdraft.com
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
