"use client";

import React from "react";
import { useLocale } from "next-intl";

export default function PolicyPage() {
  const locale = useLocale();
  const content = locale === "sw" ? swContent : enContent;

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-[#292524] rounded-2xl shadow-xl overflow-hidden border border-[#44403c]">
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
              {content.sections.intro.title}
            </h2>
            <p>{content.sections.intro.body}</p>
          </section>

          <div className="h-px bg-[#44403c]" />

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-[var(--primary)] text-xl">02.</span>{" "}
              {content.sections.policy.title}
            </h2>
            <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c] space-y-4">
              <div>
                <h3 className="font-bold text-white">
                  {content.sections.policy.fairPlay.title}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                  {content.sections.policy.fairPlay.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-white">
                  {content.sections.policy.conduct.title}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                  {content.sections.policy.conduct.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-white">
                  {content.sections.policy.enforcement.title}
                </h3>
                <p className="text-sm mt-1">
                  {content.sections.policy.enforcement.body}
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-[#44403c]" />

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-[var(--primary)] text-xl">03.</span>{" "}
              {content.sections.privacy.title}
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-white text-lg">
                  {content.sections.privacy.dataCollection.title}
                </h3>
                <p className="text-sm mt-1">
                  {content.sections.privacy.dataCollection.body}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  {content.sections.privacy.dataUsage.title}
                </h3>
                <p className="text-sm mt-1">
                  {content.sections.privacy.dataUsage.body}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  {content.sections.privacy.userRights.title}
                </h3>
                <p className="text-sm mt-1">
                  {content.sections.privacy.userRights.body}
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-[#44403c]" />

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-[var(--primary)] text-xl">04.</span>{" "}
              {content.sections.controls.title}
            </h2>
            <div className="bg-[#1c1917] border border-[#44403c] p-6 rounded-lg">
              <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">
                {content.sections.controls.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="text-center pt-8">
            <h2 className="text-xl font-bold text-white mb-2">
              {content.sections.contact.title}
            </h2>
            <p>{content.sections.contact.body}</p>
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

const enContent = {
  title: "Policy & Privacy",
  lastUpdated: "Last Updated: February 2026",
  sections: {
    intro: {
      title: "Introduction",
      body: "Drafti is a competitive online draughts platform. By creating an account or playing, users agree to this policy to protect fair play, security, and community standards.",
    },
    policy: {
      title: "Game Policy",
      fairPlay: {
        title: "Fair Play",
        items: [
          "No external engines, bots, or scripts",
          "No rating manipulation or sandbagging",
          "No intentional disconnects to avoid losses",
        ],
      },
      conduct: {
        title: "Player Conduct",
        items: [
          "Respectful communication only",
          "No harassment or abusive language",
          "No impersonation or account sharing",
        ],
      },
      enforcement: {
        title: "Enforcement",
        body: "Violations may lead to warnings, suspensions, or permanent bans. Drafti may remove content or restrict access to protect fair play.",
      },
    },
    privacy: {
      title: "Privacy Guidelines",
      dataCollection: {
        title: "1. Data Collection",
        body: "We collect basic identifiers (username, email), gameplay data (moves, results), and technical data (device, IP) to operate and secure the service.",
      },
      dataUsage: {
        title: "2. Data Usage",
        body: "Data is used for matchmaking, leaderboards, security, and performance. We do not sell personal data.",
      },
      userRights: {
        title: "3. User Rights",
        body: "You can request access, correction, or deletion of your data.",
      },
    },
    controls: {
      title: "Privacy Controls",
      items: [
        "Edit or remove your profile information",
        "Request data export or deletion",
        "Opt out of non-essential communications",
      ],
    },
    contact: {
      title: "Contact & Support",
      body: "For questions or to report a violation, contact support.",
    },
  },
};

const swContent = {
  title: "Sera na Faragha",
  lastUpdated: "Imesasisishwa: Februari 2026",
  sections: {
    intro: {
      title: "Utangulizi",
      body: "Drafti ni jukwaa la mtandaoni la mchezo wa drafti. Kwa kufungua akaunti au kucheza, unakubali sera hii ili kulinda usawa, usalama, na jumuiya.",
    },
    policy: {
      title: "Sera ya Mchezo",
      fairPlay: {
        title: "Mchezo wa Haki",
        items: [
          "Hakuna matumizi ya injini za nje, bots au scripts",
          "Hakuna kudanganya kiwango (sandbagging)",
          "Hakuna kukata mtandao ili kuepuka kushindwa",
        ],
      },
      conduct: {
        title: "Mwenendo wa Mchezaji",
        items: [
          "Lugha ya heshima pekee",
          "Hakuna matusi au unyanyasaji",
          "Hakuna kujifanya mtu mwingine au kugawana akaunti",
        ],
      },
      enforcement: {
        title: "Utekelezaji",
        body: "Ukiukaji unaweza kusababisha onyo, kusimamishwa kwa muda, au kufungiwa kabisa. Drafti inaweza kuondoa maudhui au kuzuia ufikiaji.",
      },
    },
    privacy: {
      title: "Mwongozo wa Faragha",
      dataCollection: {
        title: "1. Ukusanyaji wa Taarifa",
        body: "Tunakusanya taarifa za msingi (jina la mtumiaji, barua pepe), data ya mchezo (hatua, matokeo), na taarifa za kiufundi kuendesha huduma.",
      },
      dataUsage: {
        title: "2. Matumizi ya Taarifa",
        body: "Taarifa zinatumika kwa kupanga mechi, viwango, usalama, na utendaji. Hatuzuuzi taarifa binafsi.",
      },
      userRights: {
        title: "3. Haki za Mtumiaji",
        body: "Una haki ya kuomba taarifa zako, kurekebisha, au kuomba kufutwa.",
      },
    },
    controls: {
      title: "Udhibiti wa Faragha",
      items: [
        "Hariri au ondoa taarifa zako",
        "Omba kupewa nakala ya data au kufutwa",
        "Jiondoe kwenye mawasiliano yasiyo ya lazima",
      ],
    },
    contact: {
      title: "Mawasiliano na Msaada",
      body: "Kwa maswali au kuripoti ukiukwaji, wasiliana na msaada.",
    },
  },
};
