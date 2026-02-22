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
    description: "Danger: 1/9 â€” gentle, makes frequent mistakes.",
    avatarSrc: "/avatar/swala.png",
  },
  {
    level: 2,
    name: "Twiga",
    elo: 800,
    description: "Danger: 2/9 â€” basic tactics, spots obvious captures.",
    avatarSrc: "/avatar/twiga.png",
  },
  {
    level: 3,
    name: "Nyati",
    elo: 1100,
    description: "Danger: 3/9 â€” punishes blunders, plays with intent.",
    avatarSrc: "/avatar/nyati.png",
  },
  {
    level: 4,
    name: "Tembo",
    elo: 1400,
    description: "Danger: 4/9 â€” sets traps, strong capture sequences.",
    avatarSrc: "/avatar/tembo.png",
  },
  {
    level: 5,
    name: "Mamba",
    elo: 1700,
    description: "Danger: 5/9 â€” squeezes positions, converts advantages.",
    avatarSrc: "/avatar/mamba.png",
  },
  {
    level: 6,
    name: "Chui",
    elo: 2000,
    description: "Danger: 6/9 â€” ruthless tactics, fewer misses.",
    avatarSrc: "/avatar/chui.png",
  },
  {
    level: 7,
    name: "Simba",
    elo: 2300,
    description: "Danger: 7/9 â€” apex predator. Rarely misses.",
    avatarSrc: "/avatar/simba.png",
  },
  {
    level: 8,
    name: "Zombie",
    elo: 2400,
    description: "Danger: 8/9 â€” undying threat. Powered by Kallisto engine.",
    avatarSrc: "/avatar/zombie.svg",
  },
  {
    level: 9,
    name: "Dragon",
    elo: 2600,
    description: "Danger: 9/9 â€” grandmaster flame. Near-perfect play.",
    avatarSrc: "/avatar/dragon.svg",
  },
];

export const getBotByLevel = (level: number) => {
  return BOTS.find((bot) => bot.level === level) || BOTS[0];
};


