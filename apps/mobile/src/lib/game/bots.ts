import { Asset } from "expo-asset";

export type BotTier = {
  label: string;
  range: [number, number];
  color: string;
  bg: string;
};

export const TIERS: BotTier[] = [
  { label: "Beginner",    range: [1,  3],  color: "#7dd3fc", bg: "rgba(125, 211, 252, 0.1)" },
  { label: "Casual",      range: [4,  7],  color: "#6ee7b7", bg: "rgba(110, 231, 183, 0.1)" },
  { label: "Competitive", range: [8,  11], color: "#fcd34d", bg: "rgba(252, 211, 77, 0.1)" },
  { label: "Expert",      range: [12, 16], color: "#fb923c", bg: "rgba(251, 146, 60, 0.1)" },
  { label: "Undisputed",  range: [17, 19], color: "#fb7185", bg: "rgba(251, 113, 133, 0.1)" },
];

export const BOT_IMAGES: Record<string, any> = {
  tau: require("../../../assets/bot-avatars/tau.webp"),
  abebe: require("../../../assets/bot-avatars/abebe.webp"),
  kwabena: require("../../../assets/bot-avatars/kwabena.webp"),
  zuberi: require("../../../assets/bot-avatars/zuberi.webp"),
  themba: require("../../../assets/bot-avatars/themba.webp"),
  azibo: require("../../../assets/bot-avatars/azibo.webp"),
  awotwi: require("../../../assets/bot-avatars/awotwi.webp"),
  abioye: require("../../../assets/bot-avatars/abioye.webp"),
  jabari: require("../../../assets/bot-avatars/jabari.webp"),
  sekou: require("../../../assets/bot-avatars/sekou.webp"),
  dumisani: require("../../../assets/bot-avatars/dumisani.webp"),
  thabani: require("../../../assets/bot-avatars/thabani.webp"),
  chike: require("../../../assets/bot-avatars/chike.webp"),
  olumide: require("../../../assets/bot-avatars/olumide.webp"),
  kamau: require("../../../assets/bot-avatars/kamau.webp"),
  mandla: require("../../../assets/bot-avatars/mandla.webp"),
  amari: require("../../../assets/bot-avatars/amari.webp"),
  tendai: require("../../../assets/bot-avatars/tendai.webp"),
  nkosi: require("../../../assets/bot-avatars/nkosi.webp"),
};

export type BotProfile = {
  level: number;
  name: string;
  elo: number;
  description: string;
  imageKey: string;
};

export const BOTS: BotProfile[] = [
  // ── Beginner (1–3) — all play at Tau strength, 70% blunder ──────────────
  { level: 1,  name: "Tau",      elo: 500,  description: "Friendly and forgiving. Perfect for your first games.", imageKey: "tau" },
  { level: 2,  name: "Abebe",    elo: 500,  description: "Laid-back style, slow to react. Good for new players.", imageKey: "abebe" },
  { level: 3,  name: "Kwabena",  elo: 500,  description: "Relaxed and error-prone. Still learning the ropes.", imageKey: "kwabena" },
  // ── Casual (4–7) — all play at Kwabena strength, 50% blunder ────────────
  { level: 4,  name: "Zuberi",   elo: 700,  description: "Plays casually with occasional lucky moves.", imageKey: "zuberi" },
  { level: 5,  name: "Themba",   elo: 700,  description: "Inconsistent and unpredictable. Sometimes brilliant, often careless.", imageKey: "themba" },
  { level: 6,  name: "Azibo",    elo: 700,  description: "Flashes of tactical awareness. Not yet reliable.", imageKey: "azibo" },
  { level: 7,  name: "Awotwi",   elo: 700,  description: "Plays for fun, not precision. Misses threats half the time.", imageKey: "awotwi" },
  // ── Competitive (8–11) — all play at Zuberi strength, 25% blunder ───────
  { level: 8,  name: "Abioye",   elo: 800,  description: "Starting to show real intent. Blunders less, punishes loose play.", imageKey: "abioye" },
  { level: 9,  name: "Jabari",   elo: 800,  description: "Competitive mindset. Will take your pieces if left unguarded.", imageKey: "jabari" },
  { level: 10, name: "Sekou",    elo: 800,  description: "Solid and disciplined. Fewer mistakes, more pressure.", imageKey: "sekou" },
  { level: 11, name: "Dumisani", elo: 800,  description: "Steady competitor. Reads the board and rarely gifts pieces.", imageKey: "dumisani" },
  // ── Expert (12–16) — all play at Azibo strength, 5% blunder ────────────
  { level: 12, name: "Thabani",  elo: 1000, description: "Sharp and composed. Plays with purpose, very rarely blunders.", imageKey: "thabani" },
  { level: 13, name: "Chike",    elo: 1000, description: "Tactical and calculated. Exploits every weakness.", imageKey: "chike" },
  { level: 14, name: "Olumide",  elo: 1000, description: "Precise endgame play. Converts advantages clinically.", imageKey: "olumide" },
  { level: 15, name: "Kamau",    elo: 1000, description: "Relentless and patient. Applies constant pressure.", imageKey: "kamau" },
  { level: 16, name: "Mandla",   elo: 1000, description: "Near-flawless execution. Every move has a plan.", imageKey: "mandla" },
  // ── Undisputed (17–19) — full progressive strength, 0% blunder ──────────
  { level: 17, name: "Amari",    elo: 2100, description: "Powered by Mkaguzi. Tenacious attacker, hard to shake.", imageKey: "amari" },
  { level: 18, name: "Tendai",   elo: 2200, description: "Powered by Mkaguzi. Apex tactical hunter.", imageKey: "tendai" },
  { level: 19, name: "Nkosi",    elo: 2300, description: "Powered by Mkaguzi. The final boss. Mistakes are not an option.", imageKey: "nkosi" },
];

/**
 * Decodes all 19 bot avatar WebPs into native image memory.
 * Call once during app startup so the setup-ai grid renders instantly
 * without a decode stall on first open.
 */
export function preloadBotImages(): Promise<void> {
  return Asset.loadAsync(Object.values(BOT_IMAGES)).then(() => {});
}

export const getBotByLevel = (level: number) => {
  return BOTS.find((bot) => bot.level === level) || BOTS[0];
};

export const getTierForLevel = (level: number) => {
  return TIERS.find(({ range: [s, e] }) => level >= s && level <= e) ?? TIERS[0];
};
