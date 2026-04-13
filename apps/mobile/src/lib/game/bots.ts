export type BotTier = {
  label: string;
  range: [number, number];
  color: string;
  bg: string;
};

export const TIERS: BotTier[] = [
  { label: "Beginner", range: [1, 5], color: "#7dd3fc", bg: "rgba(125, 211, 252, 0.1)" },
  { label: "Casual", range: [6, 9], color: "#6ee7b7", bg: "rgba(110, 231, 183, 0.1)" },
  { label: "Competitive", range: [10, 13], color: "#fcd34d", bg: "rgba(252, 211, 77, 0.1)" },
  { label: "Expert", range: [14, 16], color: "#fb923c", bg: "rgba(251, 146, 60, 0.1)" },
  { label: "Master", range: [17, 19], color: "#fb7185", bg: "rgba(251, 113, 133, 0.1)" },
];

export const BOT_IMAGES: Record<string, any> = {
  tau: require("../../../assets/bot-avatars/tau.png"),
  abebe: require("../../../assets/bot-avatars/abebe.png"),
  kwabena: require("../../../assets/bot-avatars/kwabena.png"),
  zuberi: require("../../../assets/bot-avatars/zuberi.png"),
  themba: require("../../../assets/bot-avatars/themba.png"),
  azibo: require("../../../assets/bot-avatars/azibo.png"),
  awotwi: require("../../../assets/bot-avatars/awotwi.png"),
  abioye: require("../../../assets/bot-avatars/abioye.png"),
  jabari: require("../../../assets/bot-avatars/jabari.png"),
  sekou: require("../../../assets/bot-avatars/sekou.png"),
  dumisani: require("../../../assets/bot-avatars/dumisani.png"),
  thabani: require("../../../assets/bot-avatars/thabani.png"),
  chike: require("../../../assets/bot-avatars/chike.png"),
  olumide: require("../../../assets/bot-avatars/olumide.png"),
  kamau: require("../../../assets/bot-avatars/kamau.png"),
  mandla: require("../../../assets/bot-avatars/mandla.png"),
  amari: require("../../../assets/bot-avatars/amari.png"),
  tendai: require("../../../assets/bot-avatars/tendai.png"),
  nkosi: require("../../../assets/bot-avatars/nkosi.png"),
};

export type BotProfile = {
  level: number;
  name: string;
  elo: number;
  description: string;
  imageKey: string;
};

export const BOTS: BotProfile[] = [
  { level: 1, name: "Tau", elo: 500, description: "Danger: 1/19 - light pressure, many tactical misses.", imageKey: "tau" },
  { level: 2, name: "Abebe", elo: 600, description: "Danger: 2/19 - basic play, limited combinations.", imageKey: "abebe" },
  { level: 3, name: "Kwabena", elo: 700, description: "Danger: 3/19 - active but still error-prone.", imageKey: "kwabena" },
  { level: 4, name: "Zuberi", elo: 800, description: "Danger: 4/19 - sees short tactical ideas.", imageKey: "zuberi" },
  { level: 5, name: "Themba", elo: 900, description: "Danger: 5/19 - sharper vision, still inconsistent.", imageKey: "themba" },
  { level: 6, name: "Azibo", elo: 1000, description: "Danger: 6/19 - opportunistic and fast to punish blunders.", imageKey: "azibo" },
  { level: 7, name: "Awotwi", elo: 1100, description: "Danger: 7/19 - tighter control and traps.", imageKey: "awotwi" },
  { level: 8, name: "Abioye", elo: 1200, description: "Danger: 8/19 - tactical strikes with better precision.", imageKey: "abioye" },
  { level: 9, name: "Jabari", elo: 1300, description: "Danger: 9/19 - strong attacks and clean conversions.", imageKey: "jabari" },
  { level: 10, name: "Sekou", elo: 1400, description: "Danger: 10/19 - disciplined structure and pressure.", imageKey: "sekou" },
  { level: 11, name: "Dumisani", elo: 1500, description: "Danger: 11/19 - durable defense, punishes overextension.", imageKey: "dumisani" },
  { level: 12, name: "Thabani", elo: 1600, description: "Danger: 12/19 - heavy positional squeeze.", imageKey: "thabani" },
  { level: 13, name: "Chike", elo: 1700, description: "Danger: 13/19 - high tactical force, low tolerance for mistakes.", imageKey: "chike" },
  { level: 14, name: "Olumide", elo: 1800, description: "Danger: 14/19 - powerful endgame control.", imageKey: "olumide" },
  { level: 15, name: "Kamau", elo: 1900, description: "Danger: 15/19 - relentless tactical pressure.", imageKey: "kamau" },
  { level: 16, name: "Mandla", elo: 2000, description: "Danger: 16/19 - near-elite calculation depth.", imageKey: "mandla" },
  { level: 17, name: "Amari", elo: 2100, description: "Danger: 17/19 - tenacious attacker, hard to shake.", imageKey: "amari" },
  { level: 18, name: "Tendai", elo: 2200, description: "Danger: 18/19 - apex tactical hunter.", imageKey: "tendai" },
  { level: 19, name: "Nkosi", elo: 2300, description: "Danger: 19/19 - final boss. Rarely misses.", imageKey: "nkosi" },
];

export const getBotByLevel = (level: number) => {
  return BOTS.find((bot) => bot.level === level) || BOTS[0];
};

export const getTierForLevel = (level: number) => {
  return TIERS.find(({ range: [s, e] }) => level >= s && level <= e) ?? TIERS[0];
};
