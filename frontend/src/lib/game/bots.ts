export const BOTS = [
  { level: 1, name: "Juma", elo: 350, description: "Beginner", avatar: "👶" },
  { level: 2, name: "Aisha", elo: 750, description: "Casual", avatar: "🙂" },
  {
    level: 3,
    name: "Baraka",
    elo: 1000,
    description: "Intermediate",
    avatar: "😐",
  },
  {
    level: 4,
    name: "Zuwena",
    elo: 1200,
    description: "Standard",
    avatar: "🤔",
  },
  { level: 5, name: "Mosi", elo: 1500, description: "Advanced", avatar: "😎" },
  { level: 6, name: "Kassim", elo: 2000, description: "Expert", avatar: "🤖" },
  { level: 7, name: "Simba", elo: 2500, description: "Master", avatar: "🦁" },
];

export const getBotByLevel = (level: number) => {
  return BOTS.find((bot) => bot.level === level) || BOTS[0];
};
