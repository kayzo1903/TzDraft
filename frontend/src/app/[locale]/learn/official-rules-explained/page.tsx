import React from "react";
import { Link } from "@/i18n/routing";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata, getSiteUrl, isAppLocale } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { Calendar, ArrowLeft, User, Tag, ShieldCheck, Zap, Info } from "lucide-react";

/* ── Bilingual Content ───────────────────────────────────────────────────── */

const ARTICLE = {
  slug: "official-rules-explained",
  publishedAt: "2026-04-09T12:00:00Z",
  author: "TZD Rules Committee",
  coverImageUrl: "/learn/official-rules.png",
  en: {
    title: "Official Tanzania Drafti Rules Explained: The 8x8 Standard",
    description: "A comprehensive guide to the official TZD rules, covering mandatory captures, the unique forward-only movement, and flying king strategies.",
    category: "Official Standards",
    body: (
      <>
        <p>
          Tanzania Drafti (TZD) is not just a game; it is a sport governed by strict standards to ensure fair play and competitive integrity. 
          While it shares roots with other Draughts-64 variants, TZD has unique characteristics that every player must master to compete at a high level.
        </p>

        <div className="my-8 rounded-xl border border-primary/40 bg-primary/10 px-5 py-4 flex gap-3">
          <ShieldCheck className="w-6 h-6 text-orange-300 shrink-0" />
          <p className="text-orange-300 text-sm leading-relaxed">
            <strong>The Golden Rule:</strong> Men can NEVER move or capture backward. In Tanzania Drafti, a man only moves forward.
          </p>
        </div>

        <h2>1. The Equipment and Setup</h2>
        <p>
          TZD is played on an <strong>8x8 square board</strong>. The game uses only the 32 dark squares. 
          Each player starts with 12 pieces (men). The board must be positioned so that the "long diagonal" starts at the left-hand side of each player.
        </p>
        <ul>
          <li><strong>White moves first.</strong> This is a standard in almost all TZD Federation matches.</li>
          <li><strong>Starting position:</strong> Men occupy the first three ranks of each side.</li>
        </ul>

        <h2>2. Movement: Men vs. Kings</h2>
        <h3>Men: The Forward Path</h3>
        <p>
          A man moves diagonally forward one square to an adjacent empty dark square. 
          Crucially, TZD rules are very strict: men can <strong>NEVER</strong> move backward—not for regular moves, and not even for captures.
        </p>

        <h3>Kings: The "Flying King"</h3>
        <p>
          When a man reaches the opponent's back rank, it is promoted to a King. 
          In TZD, we use the <strong>Flying King</strong> rule. A king moves diagonally forward or backward any number of empty squares.
        </p>

        <h2>3. Capturing: "Ula ni Lazima"</h2>
        <p>
          Capturing is <strong>mandatory</strong>. If a move exists to capture an opponent's piece, you must take it.
        </p>
        
        <div className="my-6 rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-4 flex gap-3">
          <Zap className="w-6 h-6 text-blue-300 shrink-0" />
          <p className="text-blue-300 text-sm leading-relaxed">
            <strong>Free Choice:</strong> Unlike some variants that force you to take the path with the most pieces, TZD allows "Free Choice." 
            If you have two different capturing paths, you can choose either one, regardless of how many pieces you capture.
          </p>
        </div>

        <h3>The Mid-Capture Promotion Rule</h3>
        <p>
          One nuance that often surprises new players is the promotion rule during a multi-jump. 
          If a man reaches the back rank during a jump sequence, it is promoted and its turn <strong>ends immediately</strong>. 
          It cannot continue jumping as a king on the same turn.
        </p>

        <h2>4. Drawing and Timeouts</h2>
        <p>
          TZD has specific rules for endgames to prevent endless loops:
        </p>
        <ul>
          <li><strong>3 Kings vs 1 King:</strong> The stronger side has 12 moves to capture the lone king. If they fail, it's a draw.</li>
          <li><strong>Threefold Repetition:</strong> If the same position occurs three times, the game is a draw.</li>
          <li><strong>30-Move Rule:</strong> If 30 full moves occur with only kings and no captures, the game is a draw.</li>
        </ul>

        <p>
          In timeout situations, a lone king is considered "stronger material" than two men, because the two men cannot reliably force a win against a flying king. 
          Therefore, if a lone king runs out of time against two men, it is often declared a draw.
        </p>
      </>
    )
  },
  sw: {
    title: "Sheria Rasmi za Drafti ya Tanzania: Kiwango cha 8x8",
    description: "Mwongozo kamili wa sheria za TZD, ukigusia ula ni lazima, mwendo wa kusonga mbele pekee, na mbinu za kingi huruka.",
    category: "Viwango Rasmi",
    body: (
      <>
        <p>
          Drafti ya Tanzania (TZD) si mchezo tu; ni mchezo unaoongozwa na viwango vikali ili kuhakikisha ushindani wa haki. 
          Ingawa ina asili sawa na aina nyingine za Drafti ya 64, TZD ina sifa za kipekee ambazo kila mchezaji lazima azijue ili kushindana katika kiwango cha juu.
        </p>

        <div className="my-8 rounded-xl border border-primary/40 bg-primary/10 px-5 py-4 flex gap-3">
          <ShieldCheck className="w-6 h-6 text-orange-300 shrink-0" />
          <p className="text-orange-300 text-sm leading-relaxed">
            <strong>Sheria ya Dhahabu:</strong> Kete za kawaida (men) haziwezi kurudi nyuma kamwe—hata kwa kula. Katika Drafti ya Tanzania, kete husonga mbele pekee.
          </p>
        </div>

        <h2>1. Vifaa na Mpangilio</h2>
        <p>
          TZD huchezwa kwenye <strong>ubao wa 8x8</strong>. Mchezo hutumia sanduku nyeusi 32 pekee. 
          Kila mchezaji huanza na kete 12. Ubao lazima uwekwe hivi kwamba "ulalo mrefu" unaanza upande wa kushoto wa kila mchezaji.
        </p>
        <ul>
          <li><strong>Nyeupe huanza kwanza.</strong> Hiki ni kiwango katika karibu mashindano yote ya Shirikisho la Drafti Tanzania.</li>
          <li><strong>Mpangilio wa kwanza:</strong> Kete hupangwa kwenye mistari mitatu ya kwanza ya kila upande.</li>
        </ul>

        <h2>2. Mwendo: Kete za Kawaida vs. Kingi</h2>
        <h3>Kete za Kawaida: Njia ya Mbele</h3>
        <p>
          Kete ya kawaida husonga mbele kwa ulalo sanduku moja hadi kwenye sanduku nyeusi lililo wazi. 
          Ni muhimu kujua kuwa sheria za TZD ni kali: kete za kawaida <strong>HAZIWEZI</strong> kurudi nyuma—si kwa mwendo wa kawaida, na hata kwa kula.
        </p>

        <h3>Kingi: "Kingi Huruka"</h3>
        <p>
          Kete ya kawaida inapofika mwisho wa ubao wa mpinzani, hupandishwa na kuwa Kingi. 
          Katika TZD, tunatumia sheria ya <strong>Kingi Huruka</strong>. Kingi anaweza kusonga mbele au nyuma kwa ulalo kwa idadi yoyote ya sanduku lililo wazi.
        </p>

        <h2>3. Kula: "Ula ni Lazima"</h2>
        <p>
          Kula ni <strong>lazima</strong>. Ikiwa kuna mwendo wa kula kete ya mpinzani, ni lazima ule.
        </p>
        
        <div className="my-6 rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-4 flex gap-3">
          <Zap className="w-6 h-6 text-blue-300 shrink-0" />
          <p className="text-blue-300 text-sm leading-relaxed">
            <strong>Uchaguzi Huru (Free Choice):</strong> Tofauti na baadhi ya aina za drafti zinazokulazimisha kufuata njia yenye kete nyingi zaidi, TZD inaruhusu "Uchaguzi Huru." 
            Ikiwa una njia mbili tofauti za kula, unaweza kuchagua yoyote, bila kujali idadi ya kete unazokula.
          </p>
        </div>

        <h3>Sheria ya Kupandishwa Kingi Katikati ya Kula</h3>
        <p>
          Jambo moja linalowashangaza wachezaji wapya ni sheria ya kupandishwa kingi wakati wa mfululizo wa kula. 
          Ikiwa kete inafika mwisho wa ubao wakati bado inaendelea kula, itapandishwa kuwa kingi na mwendo wake <strong>utaishia hapo hapo</strong>. 
          Haiwezi kuendelea kula kama kingi katika zamu hiyo hiyo.
        </p>

        <h2>4. Sare na Muda</h2>
        <p>
          TZD ina sheria maalum za mwisho wa mchezo ili kuzuia michezo usioisha:
        </p>
        <ul>
          <li><strong>Kingi 3 dhidi ya Kingi 1:</strong> Upande wenye nguvu una hatua 12 za kula kingi huyo mmoja. Ukishindwa, mchezo unakuwa sare.</li>
          <li><strong>Marudio ya Mara Tatu:</strong> Ikiwa nafasi ile ile inatokea mara tatu, mchezo unakuwa sare.</li>
          <li><strong>Sheria ya Hatua 30:</strong> Ikiwa hatua 30 kamili zinapita na kuna mfalme pekee na hakuna kete iliyoliwa, mchezo unakuwa sare.</li>
        </ul>

        <p>
          Katika hali ya kuishiwa muda (timeout), kingi mmoja anachukuliwa kuwa na "nguvu zaidi" kuliko kete mbili za kawaida, kwa sababu kete hizo mbili haziwezi kumlazimisha kingi huyo kushindwa kwa urahisi. 
          Kwa hiyo, ikiwa kingi mmoja ataishiwa muda dhidi ya kete mbili, mara nyingi mchezo hutangazwa kuwa sare.
        </p>
      </>
    )
  }
};

/* ── Metadata ────────────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};

  const m = locale === "sw" ? ARTICLE.sw : ARTICLE.en;

  return buildPageMetadata({
    locale,
    path: `/learn/${ARTICLE.slug}`,
    title: m.title,
    description: m.description,
    keywords: [
      "Tanzania Drafti rules", "Draughts-64 rules", "TZD official", "flying king rules",
      "mandatory capture draughts", "Sheria za Drafti", "Tanzania Draughts Federation"
    ],
    ogType: "article",
    ogImageUrl: ARTICLE.coverImageUrl,
    ogImageAlt: m.title,
    articlePublishedTime: ARTICLE.publishedAt,
    articleAuthors: [ARTICLE.author],
  });
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function OfficialRulesArticle({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;

  const isSw = locale === "sw";
  const m = isSw ? ARTICLE.sw : ARTICLE.en;

  const formattedDate = ARTICLE.publishedAt
    ? new Date(ARTICLE.publishedAt).toLocaleDateString(
        isSw ? "sw-TZ" : "en-TZ",
        { year: "numeric", month: "long", day: "numeric" }
      )
    : null;

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale as any}
        items={[
          { name: isSw ? "Nyumbani" : "Home", path: "" },
          { name: isSw ? "Makala" : "Articles", path: "/learn" },
          { name: m.title },
        ]}
      />
      
      <main className="min-h-screen bg-background py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">

          {/* Back link */}
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {isSw ? "Rudi kwenye Makala" : "Back to Articles"}
          </Link>

          {/* Cover image */}
          <div className="rounded-2xl overflow-hidden mb-8 aspect-video bg-neutral-900 border border-white/5 shadow-2xl">
            <img
              src={ARTICLE.coverImageUrl}
              alt={m.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Header */}
          <header className="mb-10 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Tag className="w-3.5 h-3.5" />
              {m.category}
            </div>

            <h1 className="text-4xl font-black text-white leading-tight sm:text-5xl">
              {m.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-neutral-500">
              {formattedDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formattedDate}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {ARTICLE.author}
              </span>
            </div>
          </header>

          {/* Body */}
          <div className="border-t border-white/5 pt-10 prose prose-invert prose-neutral max-w-none">
            {m.body}
            
            <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
              <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="text-white font-bold mb-1">
                  {isSw ? "Je, uko tayari kujaribu sheria?" : "Ready to test the rules?"}
                </h4>
                <p className="text-sm text-neutral-400 mb-4">
                  {isSw 
                    ? "Sasa kwa kuwa unajua misingi, kwa nini usijaribu kucheza dhidi ya mchezaji wa mtandaoni au AI?" 
                    : "Now that you know the basics, why not try a game against a real player or our AI?"}
                </p>
                <Link href="/play" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                  {isSw ? "Anza Cheza Sasa" : "Start Playing Now"}
                  <Zap className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
