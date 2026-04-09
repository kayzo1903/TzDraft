import React from "react";
import { Link } from "@/i18n/routing";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata, getSiteUrl, isAppLocale } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { Calendar, ArrowLeft, User, Tag, Lightbulb, Target, Shield, Zap, Info } from "lucide-react";

/* ── Bilingual Content ───────────────────────────────────────────────────── */

const ARTICLE = {
  slug: "beginner-strategies",
  publishedAt: "2026-04-09T14:30:00Z",
  author: "TzDraft Strategy Team",
  coverImageUrl: "/learn/beginner-strategies.png",
  en: {
    title: "Secrets to Winning Drafti Easily: 5 Essential Beginner Strategies",
    description: "Learn how to play Drafti well with these 5 proven strategies. Master center control, back-rank protection, and the secrets to winning drafti easily.",
    category: "Strategy & Tips",
    body: (
      <>
        <p>
          So, you’ve learned the rules of Tanzania Drafti, but you keep finding yourself on the losing end of the board. 
          Don’t worry—every grandmaster started exactly where you are. Winning at Drafti isn’t just about seeing one move 
          ahead; it’s about controlling the board’s geometry and using your opponent’s momentum against them. 
          In this guide, we reveal the <strong>secrets to winning Drafti easily</strong> by mastering five foundational strategies.
        </p>

        <div className="my-8 rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-4 flex gap-3">
          <Lightbulb className="w-6 h-6 text-blue-300 shrink-0" />
          <p className="text-blue-300 text-sm leading-relaxed">
            <strong>Pro Tip:</strong> Patience is your greatest tool. Beginners often rush to capture, but the best players wait for the perfect moment to strike.
          </p>
        </div>

        <h2>Strategy 1: Dominate the Center</h2>
        <p>
          If you want to know <strong>how to play Drafti well</strong>, start with the center. In an 8x8 game, the squares in the middle 
          (d4, e5, d6, e3) are the most valuable real estate on the board. 
        </p>
        <p>
          Why? Because pieces in the center have more "mobility." A piece on the edge of the board only has one direction to move, 
          making it easy to block. A piece in the center can branch out in multiple directions, allowing you to react quickly to 
          your opponent's threats while launching your own.
        </p>

        <h2>Strategy 2: The Sacred Back Rank</h2>
        <p>
          One of the biggest mistakes beginners make is moving their back-row pieces (the pieces on rank 1 for White, or rank 8 for Black) too early. 
          Think of your back rank as your <strong>last line of defense</strong>. 
        </p>
        <p>
          Keeping these pieces stationary prevents your opponent from promoting their men to Kings. In Tanzania Drafti, the "Flying King" is 
          incredibly powerful. If you let your opponent get a King early in the game, your chances of winning drop significantly. 
          Keep your "bridge" (the middle pieces of your back rank) solid for as long as possible.
        </p>

        <h2>Strategy 3: The Art of the Strategic Sacrifice</h2>
        <p>
          Sometimes, losing a battle helps you win the war. New players often try to protect every single piece at all costs. 
          However, a common <strong>secret to winning Drafti easily</strong> is the "forced exchange." 
        </p>
        <p>
          By sacrificing one piece, you can often force your opponent into a position where they must leave a gap in their defense, 
          allowing you to jump two or three of their pieces in return. Always look for "2-for-1" or "3-for-1" opportunities.
        </p>

        <div className="my-6 rounded-xl border border-primary/40 bg-primary/10 px-5 py-4 flex gap-3">
          <Target className="w-6 h-6 text-orange-300 shrink-0" />
          <p className="text-orange-300 text-sm leading-relaxed">
            <strong>The Trap:</strong> Use the "Ula ni Lazima" (Mandatory Capture) rule. You can lure an opponent's King into a corner 
            by offering a man as bait, then trapping them with your other pieces.
          </p>
        </div>

        <h2>Strategy 4: Invest in the Flying King</h2>
        <p>
          In TZD, a King can fly across the entire board. This makes promotion your #1 priority in the mid-game. 
          Moving your pieces in groups (clusters) is safer than sending a lone man on a suicide mission to the back rank. 
          Support your advancing pieces with others behind them to create a "wall" that is harder to break through.
        </p>

        <h2>Strategy 5: Mastering the Endgame Clock</h2>
        <p>
          The game doesn't end just because you have more pieces. You must know how to close the deal. 
          If you have 3 Kings and your opponent has 1, you only have <strong>12 moves</strong> to catch them. 
        </p>
        <p>
          Don't just chase them mindlessly. Use your Kings to "cut off" the board. Force the lone king onto a diagonal that 
          doesn't have an escape route. Remember: if you can't capture them in 12 steps, the game is a draw. Efficiency is key!
        </p>

        <h2>Conclusion</h2>
        <p>
          Mastering these five strategies is the first step toward becoming a TZD champion. Practice them against our AI levels 1-3 
          to get a feel for the patterns. Before you know it, you'll be playing Drafti like a seasoned pro!
        </p>
      </>
    )
  },
  sw: {
    title: "Siri ya Kushinda Drafti kwa Urahisi: Mbinu 5 za Msingi",
    description: "Jifunze jinsi ya kucheza drafti vizuri kwa kutumia mbinu hizi 5 zilizothibitishwa. Jifunze siri ya kushinda drafti kwa urahisi leo.",
    category: "Mbinu na Vidokezo",
    body: (
      <>
        <p>
          Umefanikiwa kujifunza sheria za Drafti ya Tanzania, lakini bado unajikuta unapoteza mchezo mara kwa mara? 
          Usijali—kila bingwa (grandmaster) alianza hapo ulipo sasa. Kushinda Drafti si kuangalia tu hatua moja mbele; 
          ni kudhibiti ubao na kutumia nguvu ya mpinzani wako dhidi yake mwenyewe. 
          Katika mwongozo huu, tutafichua <strong>siri ya kushinda drafti kwa urahisi</strong> kwa kufanya mbinu tano za msingi.
        </p>

        <div className="my-8 rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-4 flex gap-3">
          <Lightbulb className="w-6 h-6 text-blue-300 shrink-0" />
          <p className="text-blue-300 text-sm leading-relaxed">
            <strong>Kidokezo:</strong> Subira ndiyo chombo chako kikubwa zaidi. Wanaoanza mara nyingi hukimbilia kula, 
            lakini wachezaji bora husubiri wakati mwafaka wa kushambulia.
          </p>
        </div>

        <h2>Mbinu ya 1: Miliki Katikati ya Ubao</h2>
        <p>
          Ikiwa unataka kujua <strong>jinsi ya kucheza drafti vizuri</strong>, anza na kitovu cha ubao. 
          Katika ubao wa 8x8, sanduku za katikati (d4, e5, d6, e3) ndizo zenye thamani kubwa zaidi. 
        </p>
        <p>
          Kwa nini? Kwa sababu kete zilizopo katikati zina uwezo mkubwa wa "kutembea" (mobility). 
          Kete iliyo pembeni mwa ubao ina upande mmoja tu wa kusogea, jambo linalofanya iwe rahisi kuzuiwa. 
          Kete iliyopo katikati inaweza kuelekea pande nyingi, ikikuruhusu kujihami dhidi ya mashambulizi wakati unajiandaa kushambulia.
        </p>

        <h2>Mbinu ya 2: Linda Safu ya Nyuma (Back Rank)</h2>
        <p>
          Moja ya makosa makubwa wanayofanya wanaoanza ni kusogeza kete za safu ya nyuma (rank 1 kwa Nyeupe, au rank 8 kwa Nyeusi) mapema mno. 
          Chukulia safu yako ya nyuma kama <strong>ngome yako ya mwisho</strong>. 
        </p>
        <p>
          Kuziacha kete hizi hapo kunamzuia mpinzani wako asipate "Kingi." 
          Katika Drafti ya Tanzania, "Kingi Huruka" ana nguvu sana. Ukimruhusu mpinzani kupata Kingi mapema, nafasi yako ya kushinda inapungua sana. 
          Linda safu yako ya nyuma kwa gharama yoyote.
        </p>

        <h2>Mbinu ya 3: Sanaa ya "Kutoa Sadaka" (Strategic Sacrifice)</h2>
        <p>
          Wakati mwingine, kupoteza kete moja kunaweza kukusaidia kushinda mchezo mzima. 
          Wachezaji wapya mara nyingi hujaribu kulinda kila kete kwa kila hali. 
          Hata hivyo, <strong>siri ya kushinda drafti kwa urahisi</strong> ni kujua wakati wa kutoa kete moja ili ule kete mbili au tatu za mpinzani. 
        </p>
        <p>
          Hii inaitwa "forced exchange." Daima tafuta fursa za kula kete mbili kwa kutoa kete yako moja. 
          Hii itakufanya uwe na kete nyingi zaidi ubaoni kuliko mpinzani wako.
        </p>

        <div className="my-6 rounded-xl border border-primary/40 bg-primary/10 px-5 py-4 flex gap-3">
          <Target className="w-6 h-6 text-orange-300 shrink-0" />
          <p className="text-orange-300 text-sm leading-relaxed">
            <strong>Mtego:</strong> Tumia sheria ya "Ula ni Lazima." Unaweza kumvuta Kingi wa mpinzani kwenye kona 
            kwa kumtengenezea mtego wa kete moja, kisha unamkamata na kete zako nyingine.
          </p>
        </div>

        <h2>Mbinu ya 4: Wekeza Kwenye Kingi Huruka</h2>
        <p>
          Katika TZD, Kingi anaweza kuruka ubao mzima. Hii inamaanisha kupandisha kete kuwa Kingi ndiyo kipaumbele chako cha kwanza katikati ya mchezo. 
          Usisogeze kete moja peke yake kuelekea mwisho wa ubao; isogeze kama kikundi. 
          Safu ya kete inayoungana inatengeneza "ukuta" ambao ni mgumu kwa mpinzani wako kuuvunja.
        </p>

        <h2>Mbinu ya 5: Miliki Saa Mwishoni mwa Mchezo</h2>
        <p>
          Mchezo hauishi kwa sababu tu una kete nyingi. Ni lazima uweze kumaliza mchezo. 
          Ikiwa una Kingi 3 na mpinzani ana Kingi 1, una hatua <strong>12 pekee</strong> za kumkamata. 
        </p>
        <p>
          Usimkimbize tu bila mpango. Tumia Kingi wako "kukata" njia za ubao. 
          Mlazimishe kingi wa mpinzani aingie kwenye kona ambapo hana upande wa kukimbilia. 
          Kumbuka: usipomla ndani ya hatua 12, mchezo unakuwa sare. Kasi na umakini ni muhimu!
        </p>

        <h2>Hitimisho</h2>
        <p>
          Kufanya mbinu hizi tano ndiyo hatua ya kwanza ya kuwa bingwa wa TZD. 
          Zifanyie kazi dhidi ya AI yetu ya kiwango cha 1-3 ili uzoee mifumo hii. 
          Kabla hujajua, utakuwa unacheza Drafti kama mtaalamu aliyebobea!
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

  const isSw = locale === "sw";
  const m = isSw ? ARTICLE.sw : ARTICLE.en;

  return buildPageMetadata({
    locale,
    path: `/learn/${ARTICLE.slug}`,
    title: m.title,
    description: m.description,
    keywords: [
      "jinsi ya kucheza drafti vizuri", "Siri ya kushinda drafti kwa urahisi", "Drafti strategies", 
      "winning at checkers", "Mbinu za kushinda drafti", "how to win drafti"
    ],
    ogType: "article",
    ogImageUrl: ARTICLE.coverImageUrl,
    ogImageAlt: m.title,
    articlePublishedTime: ARTICLE.publishedAt,
    articleAuthors: [ARTICLE.author],
  });
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function BeginnerStrategiesArticle({
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
              <Shield className="w-6 h-6 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="text-white font-bold mb-1">
                  {isSw ? "Tayari kuwa bingwa?" : "Ready to be a champion?"}
                </h4>
                <p className="text-sm text-neutral-400 mb-4">
                  {isSw 
                    ? "Mbinu bila mazoezi ni kazi bure. Ingia kwenye ubao sasa upate uzoefu!" 
                    : "Strategy without practice is useless. Get on the board now and gain experience!"}
                </p>
                <Link href="/play" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                  {isSw ? "Cheza Sasa" : "Play Now"}
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
