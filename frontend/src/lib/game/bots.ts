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
    name: "Swala",
    elo: 500,
    description: "Danger: 1/7 — gentle, makes frequent mistakes.",
    avatarSrc: "/avatar/swala.png",
  },
  {
    level: 2,
    name: "Twiga",
    elo: 800,
    description: "Danger: 2/7 — basic tactics, spots obvious captures.",
    avatarSrc: "/avatar/twiga.png",
  },
  {
    level: 3,
    name: "Nyati",
    elo: 1100,
    description: "Danger: 3/7 — punishes blunders, plays with intent.",
    avatarSrc: "/avatar/nyati.png",
  },
  {
    level: 4,
    name: "Tembo",
    elo: 1400,
    description: "Danger: 4/7 — sets traps, strong capture sequences.",
    avatarSrc: "/avatar/tembo.png",
  },
  {
    level: 5,
    name: "Mamba",
    elo: 1700,
    description: "Danger: 5/7 — squeezes positions, converts advantages.",
    avatarSrc: "/avatar/mamba.png",
  },
  {
    level: 6,
    name: "Chui",
    elo: 2000,
    description: "Danger: 6/7 — ruthless tactics, fewer misses.",
    avatarSrc: "/avatar/chui.png",
  },
  {
    level: 7,
    name: "Simba",
    elo: 2300,
    description: "Danger: 7/7 — apex predator. Rarely misses.",
    avatarSrc: "/avatar/simba.png",
  },
];

export const getBotByLevel = (level: number) => {
  return BOTS.find((bot) => bot.level === level) || BOTS[0];
};

