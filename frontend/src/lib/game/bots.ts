export type BotProfile = {
  level: number;
  name: string;
  elo: number;
  description: string;
  avatarSrc: string;
};

export const BOTS: BotProfile[] = [
  {
    level: 1,
    name: "Tau",
    elo: 500,
    description: "Danger: 1/19 - light pressure, many tactical misses.",
    avatarSrc: "/avatar/v.1.0.1/tau.png",
  },
  {
    level: 2,
    name: "Abebe",
    elo: 600,
    description: "Danger: 2/19 - basic play, limited combinations.",
    avatarSrc: "/avatar/v.1.0.1/abebe.png",
  },
  {
    level: 3,
    name: "Kwabena",
    elo: 700,
    description: "Danger: 3/19 - active but still error-prone.",
    avatarSrc: "/avatar/v.1.0.1/kwabena.png",
  },
  {
    level: 4,
    name: "Zuberi",
    elo: 800,
    description: "Danger: 4/19 - sees short tactical ideas.",
    avatarSrc: "/avatar/v.1.0.1/zuberi.png",
  },
  {
    level: 5,
    name: "Themba",
    elo: 900,
    description: "Danger: 5/19 - sharper vision, still inconsistent.",
    avatarSrc: "/avatar/v.1.0.1/themba.png",
  },
  {
    level: 6,
    name: "Azibo",
    elo: 1000,
    description: "Danger: 6/19 - opportunistic and fast to punish blunders.",
    avatarSrc: "/avatar/v.1.0.1/azibo.png",
  },
  {
    level: 7,
    name: "Awotwi",
    elo: 1100,
    description: "Danger: 7/19 - tighter control and traps.",
    avatarSrc: "/avatar/v.1.0.1/awotwi.png",
  },
  {
    level: 8,
    name: "Abioye",
    elo: 1200,
    description: "Danger: 8/19 - tactical strikes with better precision.",
    avatarSrc: "/avatar/v.1.0.1/abioye.png",
  },
  {
    level: 9,
    name: "Jabari",
    elo: 1300,
    description: "Danger: 9/19 - strong attacks and clean conversions.",
    avatarSrc: "/avatar/v.1.0.1/jabari.png",
  },
  {
    level: 10,
    name: "Sekou",
    elo: 1400,
    description: "Danger: 10/19 - disciplined structure and pressure.",
    avatarSrc: "/avatar/v.1.0.1/sekou.png",
  },
  {
    level: 11,
    name: "Dumisani",
    elo: 1500,
    description: "Danger: 11/19 - durable defense, punishes overextension.",
    avatarSrc: "/avatar/v.1.0.1/dumisani.png",
  },
  {
    level: 12,
    name: "Thabani",
    elo: 1600,
    description: "Danger: 12/19 - heavy positional squeeze.",
    avatarSrc: "/avatar/v.1.0.1/thabani.png",
  },
  {
    level: 13,
    name: "Chike",
    elo: 1700,
    description: "Danger: 13/19 - high tactical force, low tolerance for mistakes.",
    avatarSrc: "/avatar/v.1.0.1/chike.png",
  },
  {
    level: 14,
    name: "Olumide",
    elo: 1800,
    description: "Danger: 14/19 - powerful endgame control.",
    avatarSrc: "/avatar/v.1.0.1/olumide.png",
  },
  {
    level: 15,
    name: "Kamau",
    elo: 1900,
    description: "Danger: 15/19 - powered by Mkaguzi engine. Relentless tactical pressure.",
    avatarSrc: "/avatar/v.1.0.1/kamau.png",
  },
  {
    level: 16,
    name: "Mandla",
    elo: 2000,
    description: "Danger: 16/19 - powered by Mkaguzi engine. Near-elite calculation depth.",
    avatarSrc: "/avatar/v.1.0.1/mandla.png",
  },
  {
    level: 17,
    name: "Amari",
    elo: 2100,
    description: "Danger: 17/19 - powered by Mkaguzi engine. Tenacious attacker, hard to shake.",
    avatarSrc: "/avatar/v.1.0.1/amari.png",
  },
  {
    level: 18,
    name: "Tendai",
    elo: 2200,
    description: "Danger: 18/19 - powered by Mkaguzi engine. Apex tactical hunter.",
    avatarSrc: "/avatar/v.1.0.1/tendai.png",
  },
  {
    level: 19,
    name: "Nkosi",
    elo: 2300,
    description: "Danger: 19/19 - powered by Mkaguzi engine. Final boss. Rarely misses.",
    avatarSrc: "/avatar/v.1.0.1/nkosi.png",
  },
];

export const getBotByLevel = (level: number) => {
  return BOTS.find((bot) => bot.level === level) || BOTS[0];
};