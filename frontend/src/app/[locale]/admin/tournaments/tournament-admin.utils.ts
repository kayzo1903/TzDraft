import type { Tournament } from "@/services/tournament.service";

export const REPOST_DRAFT_STORAGE_KEY = "admin_tournament_repost_draft";

export function buildRepostFormState(tournament: Tournament) {
  return {
    name: `${tournament.name} (Repost)`,
    descriptionEn: tournament.descriptionEn,
    descriptionSw: tournament.descriptionSw,
    rulesEn: tournament.rulesEn ?? "",
    rulesSw: tournament.rulesSw ?? "",
    style: tournament.style,
    scope: tournament.scope,
    country: tournament.country ?? "",
    region: tournament.region ?? "",
    maxPlayers: `${tournament.maxPlayers}`,
    minPlayers: `${tournament.minPlayers}`,
    scheduledStartDate: "",
    scheduledStartTime: "",
    registrationDeadlineDate: "",
    registrationDeadlineTime: "",
    minElo: "",
    maxElo: "",
    minMatchmakingWins: "",
    minAiLevelBeaten: "",
    requiredAiLevelPlayed: "",
  };
}
