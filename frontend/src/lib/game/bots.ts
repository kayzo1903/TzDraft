export type BotProfile = {
  level: number;
  name: string;
  elo: number;
  description: string;
  avatarSrc: string;
};

export const BOTS: BotProfile[] = [
  // ── Beginner (levels 1–3) — all play at Tau strength, 70% blunder ──────
  {
    level: 1,
    name: "Tau",
    elo: 500,
    description: "Friendly and forgiving. Makes plenty of mistakes — perfect for your first games.",
    avatarSrc: "/avatar/v.1.0.1/tau.png",
  },
  {
    level: 2,
    name: "Abebe",
    elo: 500,
    description: "Laid-back style, slow to react. A good sparring partner for new players.",
    avatarSrc: "/avatar/v.1.0.1/abebe.png",
  },
  {
    level: 3,
    name: "Kwabena",
    elo: 500,
    description: "Relaxed and error-prone. Still learning the ropes, just like you.",
    avatarSrc: "/avatar/v.1.0.1/kwabena.png",
  },
  // ── Casual (levels 4–7) — all play at Kwabena strength, 50% blunder ───
  {
    level: 4,
    name: "Zuberi",
    elo: 700,
    description: "Plays casually with occasional lucky moves. Blunders often but can surprise you.",
    avatarSrc: "/avatar/v.1.0.1/zuberi.png",
  },
  {
    level: 5,
    name: "Themba",
    elo: 700,
    description: "Inconsistent and unpredictable. Sometimes brilliant, often careless.",
    avatarSrc: "/avatar/v.1.0.1/themba.png",
  },
  {
    level: 6,
    name: "Azibo",
    elo: 700,
    description: "A casual player with flashes of tactical awareness. Not yet reliable.",
    avatarSrc: "/avatar/v.1.0.1/azibo.png",
  },
  {
    level: 7,
    name: "Awotwi",
    elo: 700,
    description: "Plays for fun, not precision. Misses threats half the time.",
    avatarSrc: "/avatar/v.1.0.1/awotwi.png",
  },
  // ── Competitive (levels 8–11) — all play at Zuberi strength, 25% blunder
  {
    level: 8,
    name: "Abioye",
    elo: 800,
    description: "Starting to show real intent. Blunders less and punishes loose play.",
    avatarSrc: "/avatar/v.1.0.1/abioye.png",
  },
  {
    level: 9,
    name: "Jabari",
    elo: 800,
    description: "Competitive mindset. Will take your pieces if you leave them unguarded.",
    avatarSrc: "/avatar/v.1.0.1/jabari.png",
  },
  {
    level: 10,
    name: "Sekou",
    elo: 800,
    description: "Solid and disciplined. Fewer mistakes, more pressure.",
    avatarSrc: "/avatar/v.1.0.1/sekou.png",
  },
  {
    level: 11,
    name: "Dumisani",
    elo: 800,
    description: "Steady competitor. Reads the board better and rarely gifts pieces away.",
    avatarSrc: "/avatar/v.1.0.1/dumisani.png",
  },
  // ── Expert (levels 12–16) — all play at Azibo strength, 5% blunder ────
  {
    level: 12,
    name: "Thabani",
    elo: 1000,
    description: "Sharp and composed. Plays with purpose and very rarely blunders.",
    avatarSrc: "/avatar/v.1.0.1/thabani.png",
  },
  {
    level: 13,
    name: "Chike",
    elo: 1000,
    description: "Tactical and calculated. Will exploit any weakness in your position.",
    avatarSrc: "/avatar/v.1.0.1/chike.png",
  },
  {
    level: 14,
    name: "Olumide",
    elo: 1000,
    description: "Precise endgame play. Converts advantages with clinical efficiency.",
    avatarSrc: "/avatar/v.1.0.1/olumide.png",
  },
  {
    level: 15,
    name: "Kamau",
    elo: 1000,
    description: "Relentless and patient. Applies constant pressure from the opening.",
    avatarSrc: "/avatar/v.1.0.1/kamau.png",
  },
  {
    level: 16,
    name: "Mandla",
    elo: 1000,
    description: "Near-flawless execution. Every move has a plan behind it.",
    avatarSrc: "/avatar/v.1.0.1/mandla.png",
  },
  // ── Undisputed (levels 17–19) — full progressive strength, 0% blunder ─
  {
    level: 17,
    name: "Amari",
    elo: 2100,
    description: "Powered by Mkaguzi. A tenacious attacker — hard to shake once ahead.",
    avatarSrc: "/avatar/v.1.0.1/amari.png",
  },
  {
    level: 18,
    name: "Tendai",
    elo: 2200,
    description: "Powered by Mkaguzi. Apex tactical hunter. Rarely misses a combination.",
    avatarSrc: "/avatar/v.1.0.1/tendai.png",
  },
  {
    level: 19,
    name: "Nkosi",
    elo: 2300,
    description: "Powered by Mkaguzi. The final boss. Mistakes are not an option.",
    avatarSrc: "/avatar/v.1.0.1/nkosi.png",
  },
];

export const getBotByLevel = (level: number) => {
  return BOTS.find((bot) => bot.level === level) || BOTS[0];
};