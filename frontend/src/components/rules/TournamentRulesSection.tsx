import React from "react";
import { 
  Trophy, 
  Target, 
  Zap, 
  Timer, 
  Clock, 
  ShieldCheck, 
  FileText, 
  UserSquare2 
} from "lucide-react";

interface RuleSection {
  title: string;
  icon: React.ReactNode;
  content: string[];
}

interface TournamentRulesProps {
  locale: string;
}

export const TournamentRulesSection: React.FC<TournamentRulesProps> = ({ locale }) => {
  const isSw = locale === "sw";

  const englishRules: RuleSection[] = [
    {
      title: "Match Format",
      icon: <UserSquare2 className="w-5 h-5 text-primary" />,
      content: [
        "Each league match consists of two (2) games.",
        "Players alternate playing as White and Black.",
      ]
    },
    {
      title: "Scoring System",
      icon: <Trophy className="w-5 h-5 text-primary" />,
      content: [
        "Match Win: 3 points (awarded if a player wins on aggregate).",
        "Match Draw: 1 point (awarded if each player wins one game or both are draws).",
        "Match Loss: 0 points.",
      ]
    },
    {
      title: "Elimination Format",
      icon: <Zap className="w-5 h-5 text-primary" />,
      content: [
        "Single Elimination (Knockout): One match loss results in disqualification.",
        "Winners advance to the next bracket round until the Final.",
        "In case of a match draw, extra games are played to determine the winner.",
      ]
    },
    {
      title: "Game Styles & Time",
      icon: <Timer className="w-5 h-5 text-primary" />,
      content: [
        "Blitz: Fast-paced (3-5 minutes).",
        "Rapid: Standard tournament speed (10-15 minutes).",
        "Classic: Strategic games (30+ minutes).",
        "Increments are applied per move based on league settings.",
      ]
    },
    {
      title: "Official TZD Rules",
      icon: <ShieldCheck className="w-5 h-5 text-primary" />,
      content: [
        "All matches follow the Official Tanzania Draughts Standards.",
        "Mandatory captures (Ula ni Lazima).",
        "Flying King (Kingi Huruka) rules apply.",
        "30-Move and Three-Kings draw rules are strictly enforced.",
      ]
    }
  ];

  const swahiliRules: RuleSection[] = [
    {
      title: "Mfumo wa Mechi",
      icon: <UserSquare2 className="w-5 h-5 text-primary" />,
      content: [
        "Kila mechi ya ligi itakuwa na michezo miwili (2).",
        "Wachezaji watabadilishana kuanza (Nyeupe na Nyeusi).",
      ]
    },
    {
      title: "Mfumo wa Alama",
      icon: <Trophy className="w-5 h-5 text-primary" />,
      content: [
        "Ushindi wa Mechi: Alama 3.",
        "Sare ya Mechi: Alama 1.",
        "Kupoteza Mechi: Alama 0.",
      ]
    },
    {
      title: "Mfumo wa Mtoano",
      icon: <Zap className="w-5 h-5 text-primary" />,
      content: [
        "Mtoano (Knockout): Ukipoteza mechi moja, unatolewa kwenye mashindano.",
        "Washindi wanasonga mbele hadi hatua ya Fainali.",
        "Ikitokea sare katika mechi, michezo ya ziada itachezwa kupata mshindi.",
      ]
    },
    {
      title: "Mitindo na Muda",
      icon: <Timer className="w-5 h-5 text-primary" />,
      content: [
        "Blitz: Haraka sana (Dakika 3-5).",
        "Rapid: Kasi ya kawaida (Dakika 10-15).",
        "Classic: Michezo mirefu ya kinadharia (Dakika 30+).",
        "Nyongeza ya muda huongezwa kulingana na ligi.",
      ]
    },
    {
      title: "Sheria Rasmi TZD",
      icon: <ShieldCheck className="w-5 h-5 text-primary" />,
      content: [
        "Mechi zote zinafuata Sheria Rasmi za Tanzania Draughts.",
        "Ula ni Lazima (Mandatory capture).",
        "Kingi Huruka (Flying King) inatumika.",
        "Sheria za sare (Hatua 30 na Wafalme Watatu) zinatekelezwa.",
      ]
    }
  ];

  const rules = isSw ? swahiliRules : englishRules;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map((rule, idx) => (
          <div 
            key={idx} 
            className="group relative bg-[#1c1917] p-6 rounded-xl border border-white/5 hover:border-primary/40 transition-all duration-300 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                {rule.icon}
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                {rule.title}
              </h3>
            </div>
            
            <ul className="space-y-3">
              {rule.content.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-neutral-400 text-sm leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Zap className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <h4 className="text-lg font-bold text-white mb-2">
          {isSw ? "Haki na Maadili" : "Fair Play & Conduct"}
        </h4>
        <p className="text-neutral-400 text-sm max-w-xl mx-auto">
          {isSw 
            ? "Wachezaji wote wanatarajiwa kudumisha hadhi na heshima kwa mujibu wa viwango vya kitaifa vya TZD. Matumizi ya programu ya kusaidia (Engine) au utovu wa nidhamu utasababisha kufungiwa mara moja."
            : "All players are expected to maintain professional conduct in line with national TZD standards. The use of outside assistance (Engines) or unsportsmanlike behavior will result in immediate disqualification."}
        </p>
      </div>
    </div>
  );
};
