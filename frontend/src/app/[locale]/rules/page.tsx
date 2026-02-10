"use client";

import React from "react";
import { useLocale } from "next-intl";

export default function RulesPage() {
  const locale = useLocale();
  const content = locale === "sw" ? swContent : enContent;

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-[#292524] rounded-2xl shadow-xl overflow-hidden border border-[#44403c]">
        <div className="bg-[#1c1917] px-8 py-6 border-b border-[#44403c]">
          <h1 className="text-3xl font-black text-[var(--primary)] uppercase tracking-wide">
            {content.title}
          </h1>
          <p className="mt-2 text-gray-400">{content.lastUpdated}</p>
        </div>

        <div className="p-8 space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-[var(--primary)] text-xl">01.</span>{" "}
              {content.sections.board.title}
            </h2>
            <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {content.sections.board.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <div className="h-px bg-[#44403c]" />

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-[var(--primary)] text-xl">02.</span>{" "}
              {content.sections.movement.title}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
                <h3 className="font-bold text-white mb-2">
                  {content.sections.movement.men.title}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {content.sections.movement.men.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
                <h3 className="font-bold text-white mb-2">
                  {content.sections.movement.kings.title}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {content.sections.movement.kings.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <div className="h-px bg-[#44403c]" />

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-[var(--primary)] text-xl">03.</span>{" "}
              {content.sections.captures.title}
            </h2>
            <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {content.sections.captures.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <div className="h-px bg-[#44403c]" />

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-[var(--primary)] text-xl">04.</span>{" "}
              {content.sections.endgame.title}
            </h2>
            <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {content.sections.endgame.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <div className="h-px bg-[#44403c]" />

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-[var(--primary)] text-xl">05.</span>{" "}
              {content.sections.winning.title}
            </h2>
            <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {content.sections.winning.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const enContent = {
  title: "Drafti Rules",
  lastUpdated: "Last Updated: February 2026",
  sections: {
    board: {
      title: "Board & Setup",
      items: [
        "Board size: 8 × 8, dark squares only",
        "Each player starts with 12 pieces",
        "White moves first",
        "Coordinates: A–H files, 1–8 ranks",
      ],
    },
    movement: {
      title: "Movement & Promotion",
      men: {
        title: "Men",
        items: [
          "Move one square diagonally forward",
          "Cannot move backward",
          "Promote on reaching the opponent’s back rank",
        ],
      },
      kings: {
        title: "Kings",
        items: [
          "Flying kings: move diagonally any number of squares",
          "Capture diagonally forward and backward over distance",
        ],
      },
    },
    captures: {
      title: "Captures",
      items: [
        "Capturing is mandatory when any capture exists",
        "Any capture route is allowed (no max-capture requirement)",
        "Multi-captures are allowed when available",
        "Capture path defines which pieces are removed",
      ],
    },
    endgame: {
      title: "Endgame Rules",
      items: [
        "Time loss is a draw in 3 vs 1 material",
        "Automatic 12-move countdown for 1 king vs 3 kings",
        "The 3-king side must win before move 13 or it’s a draw",
        "No special rule for 1 vs 4 material",
      ],
    },
    winning: {
      title: "Winning Conditions",
      items: [
        "Opponent has no remaining pieces",
        "Opponent has no legal moves",
        "Opponent resigns",
        "Time wins (except draw rules above)",
      ],
    },
  },
};

const swContent = {
  title: "Sheria za Drafti",
  lastUpdated: "Imesasisishwa: Februari 2026",
  sections: {
    board: {
      title: "Ubao na Mpangilio",
      items: [
        "Ukubwa wa ubao: 8 × 8, sanduku nyeusi pekee",
        "Kila mchezaji anaanza na kete 12",
        "Nyeupe huanza kwanza",
        "Vishiria: A–H kwa safu, 1–8 kwa mistari",
      ],
    },
    movement: {
      title: "Mwendo na Kupandishwa",
      men: {
        title: "Kete za Kawaida",
        items: [
          "Husonga sanduku moja mbele kwa ulalo",
          "Haziruhusiwi kurudi nyuma",
          "Hupandishwa (Kingi) ukifikia mwisho wa adui",
        ],
      },
      kings: {
        title: "Kingi",
        items: [
          "Kingi huruka: husonga kwa ulalo umbali wowote",
          "Hula mbele au nyuma kwa ulalo kwa umbali",
        ],
      },
    },
    captures: {
      title: "Ula Lazima",
      items: [
        "Ula ni lazima ikiwa kuna nafasi ya kula",
        "Njia yoyote ya kula inaruhusiwa (hakuna lazima ya kula nyingi zaidi)",
        "Mnyororo wa kula unaruhusiwa ukipatikana",
        "Njia ya kula inaamua kete zipi zinaondolewa",
      ],
    },
    endgame: {
      title: "Sheria za Mwisho wa Mchezo",
      items: [
        "Muda ukimalizika ni sare kwa 3 dhidi ya 1",
        "Hesabu ya hatua 12 kwa 1 kingi dhidi ya 3 kingi",
        "Upande wa kingi 3 lazima ushinde kabla ya hatua ya 13",
        "Hakuna sheria maalum kwa 1 dhidi ya 4",
      ],
    },
    winning: {
      title: "Masharti ya Ushindi",
      items: [
        "Mpinzani hana kete",
        "Mpinzani hana hatua halali",
        "Mpinzani amejisalimisha",
        "Ushindi kwa muda (isipokuwa sheria za sare hapo juu)",
      ],
    },
  },
};
