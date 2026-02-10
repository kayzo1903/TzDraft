
"use client";

import React from 'react';
import { useLocale } from 'next-intl';

export default function PolicyPage() {
    const locale = useLocale();
    const content = locale === 'sw' ? swContent : enContent;

    return (
        <div className="min-h-screen bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-[#292524] rounded-2xl shadow-xl overflow-hidden border border-[#44403c]">
                {/* Header */}
                <div className="bg-[#1c1917] px-8 py-6 border-b border-[#44403c]">
                    <h1 className="text-3xl font-black text-[var(--primary)] uppercase tracking-wide">
                        {content.title}
                    </h1>
                    <p className="mt-2 text-gray-400">
                        {content.lastUpdated}
                    </p>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 text-gray-300 leading-relaxed">

                    {/* Section 1: Introduction */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-[var(--primary)] text-xl">01.</span> {content.sections.intro.title}
                        </h2>
                        <p className="mb-4">{content.sections.intro.body}</p>
                    </section>

                    <div className="h-px bg-[#44403c]" />

                    {/* Section 2: Game Rules */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-[var(--primary)] text-xl">02.</span> {content.sections.rules.title}
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
                                <h3 className="font-bold text-white mb-2">{content.sections.rules.board.title}</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {content.sections.rules.board.items.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                            <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
                                <h3 className="font-bold text-white mb-2">{content.sections.rules.movement.title}</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {content.sections.rules.movement.items.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                            <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
                                <h3 className="font-bold text-white mb-2">{content.sections.rules.captures.title}</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {content.sections.rules.captures.items.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                            <div className="bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
                                <h3 className="font-bold text-white mb-2">{content.sections.rules.kings.title}</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {content.sections.rules.kings.items.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        </div>

                        <div className="mt-6 bg-[#1c1917] p-5 rounded-lg border border-[#44403c]">
                            <h3 className="font-bold text-white mb-2">{content.sections.rules.winning.title}</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm grid md:grid-cols-2 gap-2">
                                {content.sections.rules.winning.items.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                    </section>

                    <div className="h-px bg-[#44403c]" />

                    {/* Section 3: Privacy */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-[var(--primary)] text-xl">03.</span> {content.sections.privacy.title}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-white text-lg">{content.sections.privacy.dataCollection.title}</h3>
                                <p className="text-sm mt-1">{content.sections.privacy.dataCollection.body}</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{content.sections.privacy.dataUsage.title}</h3>
                                <p className="text-sm mt-1">{content.sections.privacy.dataUsage.body}</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{content.sections.privacy.userRights.title}</h3>
                                <p className="text-sm mt-1">{content.sections.privacy.userRights.body}</p>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-[#44403c]" />

                    {/* Section 4: Fair Play */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-[var(--primary)] text-xl">04.</span> {content.sections.fairPlay.title}
                        </h2>
                        <div className="bg-red-900/20 border border-red-900/50 p-6 rounded-lg">
                            <p className="mb-4">{content.sections.fairPlay.intro}</p>
                            <ul className="list-disc list-inside space-y-2 text-gray-300">
                                {content.sections.fairPlay.items.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                    </section>

                    {/* Section 5: Contact */}
                    <section className="text-center pt-8">
                        <h2 className="text-xl font-bold text-white mb-2">{content.sections.contact.title}</h2>
                        <p>{content.sections.contact.body}</p>
                        <a href="mailto:support@tzdraft.com" className="text-[var(--primary)] hover:underline mt-2 inline-block">support@tzdraft.com</a>
                    </section>

                </div>
            </div>
        </div>
    );
}

const enContent = {
    title: "Policy & Privacy Guidelines",
    lastUpdated: "Last Updated: February 2026",
    sections: {
        intro: {
            title: "Introduction",
            body: "Drafti is a competitive online draughts (checkers) platform built around Tanzanian draught principles. By creating an account or playing on Drafti, users agree to abide by this policy, which ensures fair play, security, and a respectful community."
        },
        rules: {
            title: "Game Rules",
            board: {
                title: "Board & Setup",
                items: [
                    "Board size: 8 × 8 squares",
                    "Each player starts with 12 pieces",
                    "Pieces occupy dark squares only",
                    "Players are assigned Red or Black"
                ]
            },
            movement: {
                title: "Piece Movement",
                items: [
                    "Normal pieces move one square diagonally forward",
                    "Backward movement is not allowed for normal pieces"
                ]
            },
            captures: {
                title: "Mandatory Captures",
                items: [
                    "Capturing is mandatory",
                    "If a capture is available, you must take it",
                    "Multiple captures are required when possible",
                    "Turn ends only when no further capture is available"
                ]
            },
            kings: {
                title: "King Promotion",
                items: [
                    "A piece becomes a King upon reaching the opponent’s final row",
                    "Kings may move and capture diagonally forward and backward any number of squares (Flying Kings)"
                ]
            },
            winning: {
                title: "Winning Conditions",
                items: [
                    "Opponent has no remaining pieces",
                    "Opponent has no legal moves",
                    "Opponent resigns",
                    "Opponent runs out of time"
                ]
            }
        },
        privacy: {
            title: "Privacy Guidelines",
            dataCollection: {
                title: "1. Data Collection",
                body: "We collect basic personal identifiers (username, email) and gameplay data (moves, results, device info) to improve the experience and detect cheating."
            },
            dataUsage: {
                title: "2. Data Usage",
                body: "Data is used to improve matchmaking, maintain leaderboards, and ensure fair play. We do not share personal data with third parties without consent."
            },
            userRights: {
                title: "3. User Rights",
                body: "You have the right to request access to your data, correct information, or request account deletion."
            }
        },
        fairPlay: {
            title: "Fair Play Policy",
            intro: "To ensure a fair environment for all players, the following actions are strictly prohibited:",
            items: [
                "Using bots, scripts, or external engines",
                "Manipulating ratings through intentional losses (sandbagging)",
                "Exploiting disconnects to avoid losses",
                "Harassing or abusing other players"
            ]
        },
        contact: {
            title: "Contact & Support",
            body: "For any questions regarding this policy or to report a violation, please contact us."
        }
    }
};

const swContent = {
    title: "Sera na Mwongozo wa Faragha",
    lastUpdated: "Imesasisishwa: Februari 2026",
    sections: {
        intro: {
            title: "Utangulizi",
            body: "Drafti ni jukwaa la mtandaoni la mchezo wa drafti (checkers) linalozingatia kanuni za drafti za Kitanzania. Kwa kufungua akaunti au kucheza, watumiaji wanakubaliana na sera hii ili kuhakikisha usawa, usalama, na heshima katika jumuiya."
        },
        rules: {
            title: "Sheria za Mchezo",
            board: {
                title: "Ubao na Mpangilio",
                items: [
                    "Ukubwa wa Ubao: Sanduku 8 × 8",
                    "Kila mchezaji anaanza na kete 12",
                    "Kete zinakaa kwenye sanduku nyeusi pekee",
                    "Wachezaji wanapewa Rangi Nyekundu au Nyeusi"
                ]
            },
            movement: {
                title: "Mwendo wa Kete",
                items: [
                    "Kete za kawaida zinasonga sanduku moja mbele kwa ulalo",
                    "Kete za kawaida haziruhusiwi kurudi nyuma"
                ]
            },
            captures: {
                title: "Lazima Kula",
                items: [
                    "Kula ni lazima",
                    "Ikiwa kuna nafasi ya kula, lazima ule",
                    "Lazima ule kete nyingi ikiwa inawezekana",
                    "Zamu inaisha tu pale ambapo hakuna kete nyingine ya kula"
                ]
            },
            kings: {
                title: "Kupata Kingi (Mfalme)",
                items: [
                    "Kete inakuwa Kingi inaporefika mstari wa mwisho wa adui",
                    "Kingi kinaweza kusonga na kula mbele na nyuma kwa ulalo umbali wowote (Flying Kings)"
                ]
            },
            winning: {
                title: "Masharti ya Ushindi",
                items: [
                    "Mpinzani hana kete zilizobaki",
                    "Mpinzani hana sehemu ya kucheza (hana njia)",
                    "Mpinzani amejisalimisha",
                    "Muda wa mpinzani umeisha"
                ]
            }
        },
        privacy: {
            title: "Mwongozo wa Faragha",
            dataCollection: {
                title: "1. Ukusanyaji wa Taarifa",
                body: "Tunakusanya taarifa za msingi (jina la mtumiaji, barua pepe) na data ya mchezo (hatua, matokeo, aina ya kifaa) ili kuboresha huduma na kuzuia udanganyifu."
            },
            dataUsage: {
                title: "2. Matumizi ya Taarifa",
                body: "Taarifa zinatumika kuboresha mfumo wa kupanga mechi, kuweka viwango, na kuhakikisha usawa. Hatutoi taarifa binafsi kwa wahusika wengine bila idhini."
            },
            userRights: {
                title: "3. Haki za Mtumiaji",
                body: "Una haki ya kuomba taarifa zako, kurekebisha makosa, au kuomba kufutwa kwa akaunti yako."
            }
        },
        fairPlay: {
            title: "Sera ya Mchezo wa Haki",
            intro: "Ili kuhakikisha mazingira sawa kwa wachezaji wote, vitendo vifuatavyo vimepigwa marufuku:",
            items: [
                "Kutumia roboti au programu za nje kusaidia kucheza",
                "Kupoteza mechi makusudi ili kushusha kiwango (sandbagging)",
                "Kutumia hitilafu za mtandao kukwepa kushindwa",
                "Unyanyasaji au matusi kwa wachezaji wengine"
            ]
        },
        contact: {
            title: "Mawasiliano na Msaada",
            body: "Kwa maswali yoyote kuhusu sera hii au kuripoti ukiukwaji, tafadhali wasiliana nasi."
        }
    }
};
