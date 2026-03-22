# Tournament Phase 1 — Test Plan

> **Scope:** Single Elimination, Knockout match format, max 32 players.
> Tests cover domain services, use cases, DB migration, and WebSocket events.

---

## Unit Tests — Domain Services

### MatchProgressionService (U01–U11)

| ID   | Scenario | Input | Expected `action` |
|------|----------|-------|-------------------|
| U01  | Player 1 wins game 1 | game1: P1 wins | `SPAWN_NEXT` (game 2) |
| U02  | Player 2 wins game 1 | game1: P2 wins | `SPAWN_NEXT` (game 2) |
| U03  | Game 1 draw | game1: draw | `SPAWN_NEXT` (game 2) |
| U04  | P1 wins game 2 (P1 2–0) | game2: P1 wins, P1 consec=2 | `END_MATCH` — P1 winner |
| U05  | P2 wins game 2 (P2 2–0) | game2: P2 wins, P2 consec=2 | `END_MATCH` — P2 winner |
| U06  | Split after 2 (1–1) | game2: opposite winner | `SPAWN_NEXT` (game 3) |
| U07  | P1 wins game 3 (decisive) | game3: P1 wins | `END_MATCH` — P1 winner |
| U08  | P2 wins game 3 (decisive) | game3: P2 wins | `END_MATCH` — P2 winner |
| U09  | Game 3 draw → extra game | game3: draw | `SPAWN_NEXT` (game 4, `isExtra=true`) |
| U10  | Extra game produces winner | game4 (extra): P1 wins | `END_MATCH` — P1 winner |
| U11  | Consecutive extra draws | game4 draw, game5 draw, game6: P2 wins | `END_MATCH` — P2 winner after game6 |

### BracketGenerationService (U12–U18)

| ID   | Scenario | Input | Expected Output |
|------|----------|-------|-----------------|
| U12  | Power-of-2 player count | 8 players | 4 round-1 matches, 0 BYEs |
| U13  | Non-power-of-2 count (6) | 6 players | bracket size=8, 2 BYEs for top seeds |
| U14  | Non-power-of-2 count (5) | 5 players | bracket size=8, 3 BYEs for seeds 1–3 |
| U15  | Top seeds receive BYEs | 6 players, seeds 1–6 | seeds 1 & 2 receive BYEs |
| U16  | Standard seeded pairing | 4 players, seeded 1–4 | match: seed1 vs seed4, seed2 vs seed3 |
| U17  | `generateNextRound` — winners advance | 2 winners from R1 | 1 match pairing the 2 winners |
| U18  | Seed assignment by ELO desc | 3 users ELO=[1200,1500,1100] | seeds=[2,1,3] (1500→seed1) |

### EligibilityCheckService (U19–U24)

| ID   | Scenario | Expected Result |
|------|----------|-----------------|
| U19  | Player meets all filters | `eligible: true` |
| U20  | ELO below `minElo` | `eligible: false`, reason: `minElo` |
| U21  | ELO above `maxElo` | `eligible: false`, reason: `maxElo` |
| U22  | `minMatchmakingWins` not met | `eligible: false`, reason: `minMatchmakingWins` |
| U23  | `minAiLevelBeaten` not met | `eligible: false`, reason: `minAiLevelBeaten` |
| U24  | Country filter mismatch | `eligible: false`, reason: `country` |

---

## Unit Tests — Use Cases

### CreateTournamentUseCase (U25–U27)

| ID   | Scenario | Expected |
|------|----------|----------|
| U25  | Valid payload, admin caller | Tournament created with `DRAFT` status |
| U26  | `maxPlayers > FORMAT_MAX_PLAYERS[SE]` (32) | Throws validation error |
| U27  | `minPlayers > maxPlayers` | Throws validation error |

### RegisterForTournamentUseCase (U28–U32)

| ID   | Scenario | Expected |
|------|----------|----------|
| U28  | Eligible player registers | Participant created, `eloAtSignup` snapshot saved |
| U29  | Tournament not in `REGISTRATION` status | Throws `BadRequestException` |
| U30  | Player already registered | Throws `ConflictException` |
| U31  | Tournament at capacity (`maxPlayers` reached) | Throws `BadRequestException` |
| U32  | Player fails eligibility check | Throws `ForbiddenException` with reason |

### StartTournamentUseCase (U33–U36)

| ID   | Scenario | Expected |
|------|----------|----------|
| U33  | Valid start (≥ `minPlayers` registered) | Status → `ACTIVE`, seeds assigned, R1 matches created, Game 1 spawned per real match |
| U34  | Fewer than `minPlayers` registered | Throws `BadRequestException` |
| U35  | BYE matches auto-advance | BYE participant moves to R2 without a game |
| U36  | Tournament not in `REGISTRATION` | Throws `BadRequestException` |

### ReportTournamentResultUseCase (U37–U40)

| ID   | Scenario | Expected |
|------|----------|----------|
| U37  | Game not linked to tournament | Returns early (no-op) |
| U38  | Game ends, match continues | `MatchProgressionService` returns `SPAWN_NEXT` → next game created, `currentGameId` updated |
| U39  | Game ends, match is complete | `MatchProgressionService` returns `END_MATCH` → match closed, participant records updated, `AdvanceRoundUseCase` triggered |
| U40  | Last match of round completes | `AdvanceRoundUseCase` creates next round and spawns games |

### RatingService — Tournament Guard (U41–U44)

| ID   | Scenario | Expected |
|------|----------|----------|
| U41  | `TOURNAMENT` game ends | ELO unchanged for both players |
| U42  | `TOURNAMENT` game ends — winner | Career `wins` counter incremented |
| U43  | `TOURNAMENT` game ends — loser | Career `losses` counter incremented |
| U44  | `RANKED` game ends | ELO updated normally (guard does not fire) |

---

## Integration Tests

| ID   | Scenario | Steps | Expected |
|------|----------|-------|----------|
| I01  | Full 4-player SE tournament | Create → register 4 → start → simulate all games until 1 winner | Tournament ends with `COMPLETED`, correct winner, all match records closed |
| I02  | Extra game path | 4-player bracket; final match goes 3 draws then P1 wins extra game | Final match shows `gamesPlayed=4`, correct `MatchResult.PLAYER1_WINS` |
| I03  | Resign within tournament game | Active tournament game; loser resigns | `EndGameUseCase` fires, result reported, match advances correctly |
| I04  | Timeout within tournament game | Active tournament game; winner wins on time | Timeout handled identically to resign path |
| I05  | Draw-by-agreement in tournament game | Both players agree draw in game 2 (score 1–1) | Draw recorded as `DRAW` game result, `SPAWN_NEXT` game 3 spawned |

---

## Migration Smoke Tests

| ID   | Check | Expected |
|------|-------|----------|
| M01  | Tables exist post-migration | `tournaments`, `tournament_participants`, `tournament_rounds`, `tournament_matches`, `tournament_match_games` all present |
| M02  | Enum values present | `TournamentFormat.SINGLE_ELIMINATION`, `TournamentStatus.DRAFT/REGISTRATION/ACTIVE/COMPLETED/CANCELLED`, etc. |
| M03  | FK resolution | `tournament_participants.tournament_id` → `tournaments.id` (CASCADE delete) |
| M04  | Column defaults | `tournament_participants.match_wins` defaults to `0`; `tournament_matches.player1_consec_loss` defaults to `0` |
| M05  | `games` table changes | `tournament_match_game_id` column present, nullable, unique index created |
| M06  | `ratings` table changes | `wins`, `losses`, `draws`, `matchmaking_wins`, `highest_ai_level_beaten` columns present with correct defaults |

---

## WebSocket Event Tests

| ID   | Event | Trigger | Expected Payload |
|------|-------|---------|-----------------|
| W01  | `tournamentMatchGameReady` | New game spawned for a match | `{ matchId, gameId, gameNumber, isExtra }` |
| W02  | `tournamentMatchCompleted` | Match reaches `END_MATCH` decision | `{ matchId, result, winnerId, score }` |
| W03  | `tournamentRoundAdvanced` | All matches in round complete | `{ tournamentId, newRoundNumber, matches[] }` |
| W04  | `tournamentCompleted` | Final match completes | `{ tournamentId, winnerId }` |
| W05  | `autoRequeue` guard | Game of type `TOURNAMENT` ends | `autoRequeue` event must NOT be emitted |
| W06  | `joinTournament` handler | Client emits `joinTournament` with `{ tournamentId }` | Client socket added to room `tournament:{id}` |

---

## Coverage Targets

| Layer | Target |
|-------|--------|
| `domain/tournament/services` | ≥ 90% statements, ≥ 85% branches |
| `application/use-cases/tournament` | ≥ 85% statements |
| `infrastructure/repositories/prisma-tournament.repository` | ≥ 70% statements (integration-driven) |
| `interface/http/controllers/tournament.controller` | ≥ 80% statements |
