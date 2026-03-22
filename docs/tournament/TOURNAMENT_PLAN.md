# TzDraft Tournament System — Full Plan & Vision

> **Status:** Hybrid document: live Phase 1 + future roadmap
> **Date:** 2026-03-20
> **Scope:** Backend + Frontend + Database + SEO

---

## 1. Vision

Tournaments are the competitive backbone of TzDraft. They give players a structured, meaningful reason to improve — beyond casual ranked games. The system must feel alive: brackets update in real time, players are notified when their match is ready, and standings are always visible.

The tournament system is designed around Tanzania Draughts as a regional and national sport. This means tournaments must reflect how the game is actually organized in the real world — by village, district, region, and country — not just globally. A player from Dodoma should be able to enter a Dodoma Regional Open, read its description and rules in Swahili or English, and compete against people they may actually know or face at a physical board.

Tournaments live inside the **Community** section of TzDraft. The Community page is the social and competitive hub of the platform — the place players come to see who is competing, which tournaments are open, and how they rank in their area. Every tournament has a public-facing page with a name, bilingual description, and bilingual custom rules — fully indexed by search engines.

**Tournament games do NOT affect ELO.** The ladder and the tournament bracket are completely separate systems. Players compete for tournament glory, not rating points.

---

## 2. Tournament Scope

Every tournament has a geographic scope:

| Scope | Meaning | Filter Applied At Registration |
|---|---|---|
| `GLOBAL` | Open to all players worldwide | None |
| `COUNTRY` | Restricted to one country | `user.country === tournament.country` |
| `REGION` | Restricted to one region within a country | `user.country === tournament.country AND user.region === tournament.region` |

Country and region data already exist on the `User` model from the signup + profile edit flow. No new user data collection is required.

---

## 3. Player Eligibility Filters

Admins configure eligibility when creating a tournament. All filters are optional — leaving them blank means no restriction. Multiple filters stack (player must pass ALL).

### 3.1 ELO Range

```
minElo  Int?   // e.g. 1400 — only intermediate+ players
maxElo  Int?   // e.g. 1199 — beginner-only tournament
```

ELO is snapshotted at registration time — if a player's ELO changes after registering, their registration stands. This prevents sandbagging and last-minute manipulation.

### 3.2 Minimum Online Matchmaking Wins

```
minMatchmakingWins  Int?  // e.g. 10 — must have won at least 10 ranked matchmaking games
```

**Online ranked matchmaking only.** Does not count AI games, casual PvP, friend invites, or local play. This specifically rewards players who have proven themselves in the real competitive queue against other humans.

Uses `Rating.matchmakingWins` (new field — separate from general `wins`). Updated by `rating.service.ts` after every RANKED game a player wins.

**Use case:** "Open Championship" — requires `minMatchmakingWins: 20`. Keeps out players who have only practiced against AI or friends.

### 3.3 AI Level Unlocked (Beaten)

```
minAiLevelBeaten  Int?  // e.g. 3 (=NORMAL) — must have beaten NORMAL AI or higher
```

| Int Value | AI Level | Approximate ELO |
|---|---|---|
| 0 | BEGINNER | 350 |
| 1 | EASY | 750 |
| 2 | MEDIUM | 1000 |
| 3 | NORMAL | 1200 |
| 4 | STRONG | 1500 |
| 5 | EXPERT | 2000 |
| 6 | MASTER | 2500 |

Uses `Rating.highestAiLevelBeaten`. Updated when a player wins an AI game at a level higher than their current record.

### 3.4 AI Level Played Filter

```
requiredAiLevelPlayed  Int?  // must have played at least one game at this AI level
```

Checked via a live query on the `games` table at registration time. The player only needs to have _played_, not won.

---

## 4. Tournament Formats

### Player Limits

Limits are set per format. The admin sets `maxPlayers` when creating a tournament, but cannot exceed the hard cap for the chosen format. **`minPlayers` = 4 for all formats** — if fewer than 4 players are registered when `scheduledStartAt` arrives, the tournament is automatically cancelled.

| Format | Min | Hard Cap | Recommended | Reason |
|---|---|---|---|---|
| Single Elimination | 4 | **32** | 8, 16, 32 | 5 rounds at 32 — completable in ~1 week async. Non-power-of-2 accepted; BYEs fill gaps. |
| Round Robin | 4 | **12** | 8, 10, 12 | 12 players = 66 matches, 11 rounds. Beyond 12, schedule becomes burdensome for players. |
| Swiss | 8 | **64** | 16–64 | 6 rounds at 64 players. Scales cleanly. Odd numbers fine — lowest scorer gets a round bye. |
| Double Elimination | 4 | **16** | 8, 16 | Bracket doubles in size vs. single elim. 16 players = up to ~24 matches per player in worst case. |

**Architecture note (Hetzner CX33 — 4 vCPU x86, 8 GB RAM):**

| Component | Baseline RAM | Headroom |
|---|---|---|
| Ubuntu + Docker daemon | ~500 MB | |
| NestJS (Node 22 slim) | ~300 MB | |
| Redis 7-alpine (no persistence, 512 MB cap) | ~80 MB | |
| **Total baseline** | **~880 MB** | **~7.1 GB free** |

At max tournament load (Swiss 64 = 32 simultaneous matches):
- WS sockets: 64 connections × ~8 KB = **512 KB RAM** — negligible
- Round-start DB burst: 64 Prisma ops through Supabase pooler → ~7 batches × ~10 ms = **~70 ms** to spawn all games
- Prisma default pool (9 connections) + Supabase PgBouncer handles concurrency without tuning

Player caps are driven entirely by **UX/schedule duration**, not infrastructure. The CX33 could run 10× these caps without memory pressure.

**Registration full** → registration status auto-closes the moment the 32nd/12th/64th/16th player registers. No waitlist in Phase 1.

---

### 4.1 Single Elimination (Phase 1 - Implemented)

The classic knockout bracket. Lose a match, you're out.

- Players seeded by ELO at registration time (seed 1 = highest ELO).
- Player count padded to next power of 2 with BYEs. **Top seeds receive BYEs** (seeds 1, 2, … up to BYE count) — the highest-ELO players skip round 1 and advance automatically. A BYE = advancement only, not a scored win.
- Pairing: seed 1 vs seed N, seed 2 vs seed N-1 (BYE slots at top-seed positions).
- Uses **Knockout match format** (Section 5.3) — consecutive loss elimination + extra games.
- When all matches in a round complete → `AdvanceRoundUseCase` auto-fires.

### 4.2 Round Robin (Planned - Not yet implemented)

Every player plays every other player once.

- Uses the **Points match format** (Section 5.2) — always exactly 3 games, no early exit, no extras.
- Each game: win=1pt, draw=0.5pt, loss=0pt. Match score 0–3, including 1.5–1.5 ties.
- **Standings rank by cumulative game points** across all matches.
- Tiebreak: head-to-head game point score → then total individual games won.
- All rounds generated upfront at tournament start (circle method / Berger tables). Odd player count: one player sits out each round (lowest seed rotates the bye).

### 4.3 Swiss System (Phase 2)

Fairest for medium-sized fields.

- Uses the **Points match format** (Section 5.2) — always exactly 3 games.
- Rounds: `ceil(log2(N))` — 6 rounds for 64 players. No elimination.
- **Standings rank by cumulative game points.** Tiebreak: Buchholz score (sum of opponents' total game points).
- Pairing: closest game-point totals each round, no repeat pairings. Odd player count: lowest-scored player gets a round bye (counts as 1.5 game points awarded automatically).

### 4.4 Double Elimination (Phase 3)

Winners bracket + Losers bracket. Only eliminated after two match losses. Deferred to Phase 3.

---

## 5. Match Structure — Format-Dependent Rules

Every match is 3 games. **How those 3 games are scored and resolved depends on the tournament format.**

| Format | Mode | Extra games? | Draws allowed as final result? |
|---|---|---|---|
| Single Elimination | **Knockout** | Yes — until a winner | No |
| Double Elimination | **Knockout** | Yes — until a winner | No |
| Round Robin | **Points** | No | Yes (1.5–1.5) |
| Swiss | **Points** | No | Yes (1.5–1.5) |

### 5.1 Colors (Both Modes)

Colors rotate each game within a match, regardless of format:

```
Game 1: Player A = WHITE, Player B = BLACK
Game 2: Player A = BLACK, Player B = WHITE
Game 3: Player A = WHITE, Player B = BLACK
Extra games (knockout only): odd → A=WHITE, even → A=BLACK
```

---

### 5.2 Points Mode — Round Robin & Swiss

**Always exactly 3 games. No early exit. No extra games.**

Each individual game is scored independently:

| Game result | Player A gets | Player B gets |
|---|---|---|
| A wins | 1 pt | 0 pt |
| Draw | 0.5 pt | 0.5 pt |
| B wins | 0 pt | 1 pt |

Match score = sum of game points. Total always equals 3.

```
Possible match scores: 3–0, 2.5–0.5, 2–1, 1.5–1.5, 1–2, 0.5–2.5, 0–3
```

A **1.5–1.5 tied match is a valid result** in points formats. Both players bank their 1.5 points. No extra game. The standings are fine-grained enough (game points, not match wins) that this tie resolves naturally across the full schedule.

**Standings** rank by `totalGamePoints` — the cumulative sum of game points across every match played. This is the primary metric for both Round Robin and Swiss.

**Score display:**
```
Round 2  ·  3 Games

Amina Yusuf   [W][D][W]   2.5 – 0.5
John Mwangi   [L][D][L]

──────────────────────────────

Amina Yusuf   [W][L][D]   1.5 – 1.5
Fatuma Ali    [L][W][D]
```

---

### 5.3 Knockout Mode — Single & Double Elimination

**Up to 3 games, with early exit on consecutive losses and extra games when tied.**

Every knockout match must produce a definitive winner — there are no tied results.

#### Consecutive Loss Elimination

**A player is eliminated the moment they lose 2 games consecutively within a match.** The match ends immediately — Game 3 is not played if someone is already 0–2.

A **draw does NOT count as a loss** — it resets the consecutive loss counter for both players.

```
G1: A wins, G2: A wins  →  A advances  (B 2 consecutive losses — no G3 needed)
G1: B wins, G2: B wins  →  B advances  (A 2 consecutive losses — no G3 needed)
G1: A wins, G2: DRAW    →  both counters reset; G3 must be played
```

Full outcome matrix:

| G1 | G2 | G3 | Outcome |
|---|---|---|---|
| A | A | — | **A advances** (early exit — B 2 consec losses) |
| B | B | — | **B advances** (early exit — A 2 consec losses) |
| A | B | A | **A advances** (2–1) |
| A | B | B | **B advances** (B won G2+G3 consecutively) |
| B | A | A | **A advances** (A won G2+G3 consecutively) |
| B | A | B | **B advances** (2–1) |
| D | D | D | Tied → **extra game** |
| A | B | D | Tied 1–1 → **extra game** |
| B | A | D | Tied 1–1 → **extra game** |
| D | A | B | Tied 1–1 → **extra game** |
| D | B | A | Tied 1–1 → **extra game** |
| A | D | B | Tied 1–1 → **extra game** |
| B | D | A | Tied 1–1 → **extra game** |
| D | D | A | **A advances** (1–0) |
| D | D | B | **B advances** (1–0) |

*D = Draw. — = game not played.*

#### Extra Game Rule

If after 3 games both players have equal wins, **one extra game is played.** If that also draws, another follows. No limit — play until someone wins.

#### Score Display (Knockout)

```
Round 2  ·  Knockout

Amina Yusuf   [W][W]          ← wins 2–0 (early exit)
John Mwangi   [L][L]          ← eliminated

──────────────────────────────

Round 3  ·  Knockout  +1 extra

Fatuma Ali    [W][L][D][W]    ← wins 2–1 (extra)
Baraka Juma   [L][W][D][L]
```

---

## 6. Tournament Styles (Time Control)

| Style | Time Control | Use Case |
|---|---|---|
| `BLITZ` | 5 min each | Fast, exciting knockout |
| `RAPID` | 10 min + 5s increment | Standard competitive |
| `CLASSICAL` | 30 min each | Serious, slow play |
| `UNLIMITED` | No clock | Casual / beginner tournaments |

The time control applies per game — each of the 3 games (and any extras) resets the full clock.

---

## 7. Tournament Lifecycle

### 7.1 Current Phase 1 Lifecycle

The live implementation currently behaves like this:

```
REGISTRATION -> ACTIVE -> COMPLETED
      |
      -> CANCELLED
```

Notes:

- Tournaments are currently created directly in `REGISTRATION`.
- `DRAFT` exists in the enum and data model but is not the current create path.
- Starting is currently admin-driven through the tournament monitor.
- If the admin starts with fewer than `minPlayers`, the backend cancels immediately.
- A background scheduler for automatic start/cancel is not implemented yet.

```
DRAFT ──► REGISTRATION ──► ACTIVE ──► COMPLETED
                │                        ▲
                ▼                        │
            CANCELLED            (all rounds done)
```

| Status | Who Controls | What Happens |
|---|---|---|
| `DRAFT` | Admin | Not visible to players |
| `REGISTRATION` | Admin opens | Players can register; eligibility checked |
| `ACTIVE` | Admin starts | Bracket locked, round 1 matches created |
| `COMPLETED` | Auto | Winner announced. No ELO change — tournament games are isolated from the ladder. |
| `CANCELLED` | Admin | All participants notified |

---

## 8. Bilingual Content — Name, Description, Rules

Every tournament has:

| Field | Language Support | Notes |
|---|---|---|
| `name` | Single string | Proper noun — not translated (e.g. "Dodoma Open 2026") |
| `descriptionEn` | English | Shown to `en` locale users. Admin fills in during creation. |
| `descriptionSw` | Swahili | Shown to `sw` locale users. Admin fills in during creation. |
| `rulesEn` | English | Optional custom rules/notes for this specific tournament. |
| `rulesSw` | Swahili | Optional custom rules/notes — same content as rulesEn but in Swahili. |

**Both `descriptionEn` and `descriptionSw` are required** at tournament creation. `rulesEn`/`rulesSw` are optional — if absent, the page shows a link to the general TzDraft rules page instead.

The frontend reads `locale` from the URL and renders:
```typescript
const description = locale === 'sw' ? tournament.descriptionSw : tournament.descriptionEn
const rules = locale === 'sw' ? tournament.rulesSw : tournament.rulesEn
```

These bilingual fields are also the source of truth for SEO metadata — the page's `<title>` and `<meta description>` are derived from them per locale.

---

## 9. Data Model

### 9.1 New Prisma File — `tournament.prisma`

```prisma
model Tournament {
  id          String           @id @default(uuid())
  name        String           // proper noun, not translated
  descriptionEn String         // required — English description
  descriptionSw String         // required — Swahili description
  rulesEn     String?          // optional custom rules in English
  rulesSw     String?          // optional custom rules in Swahili
  format      TournamentFormat
  style       TournamentStyle
  status      TournamentStatus @default(DRAFT)
  scope       TournamentScope  @default(GLOBAL)
  country     String?
  region      String?

  // Eligibility filters (all nullable = unrestricted)
  minElo                 Int?
  maxElo                 Int?
  minMatchmakingWins     Int?    // ranked matchmaking wins only — NOT AI or casual
  minAiLevelBeaten       Int?
  requiredAiLevelPlayed  Int?

  // Settings
  // maxPlayers must not exceed the hard cap for the chosen format:
  //   SINGLE_ELIMINATION → 32,  ROUND_ROBIN → 12,  SWISS → 64,  DOUBLE_ELIMINATION → 16
  // Enforced in CreateTournamentUseCase before persist.
  maxPlayers         Int
  minPlayers         Int         @default(4)   // if < 4 registered at start → auto-cancel
  eloImpact          Boolean     @default(false)  // always false — tournament games never affect ladder

  registrationDeadline DateTime?
  scheduledStartAt     DateTime
  createdById          String
  createdAt            DateTime   @default(now())
  updatedAt            DateTime   @updatedAt

  createdBy    User                   @relation("TournamentCreator", fields: [createdById], references: [id])
  participants TournamentParticipant[]
  rounds       TournamentRound[]

  @@map("tournaments")
}

model TournamentParticipant {
  id            String            @id @default(uuid())
  tournamentId  String
  userId        String
  seed          Int?
  eloAtSignup   Int               // snapshotted ELO at registration time
  status           ParticipantStatus @default(REGISTERED)
  matchWins        Int               @default(0)   // knockout formats: matches won
  matchLosses      Int               @default(0)   // knockout formats: matches lost
  totalGamePoints  Float             @default(0)   // points formats: cumulative game pts (e.g. 7.5)
  tiebreakScore    Float             @default(0)   // Swiss: Buchholz (sum of opponents' totalGamePoints)
  registeredAt  DateTime          @default(now())

  tournament Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  user       User       @relation("TournamentParticipant", fields: [userId], references: [id])

  @@unique([tournamentId, userId])
  @@map("tournament_participants")
}

model TournamentRound {
  id           String      @id @default(uuid())
  tournamentId String
  roundNumber  Int
  status       RoundStatus @default(PENDING)
  startedAt    DateTime?
  completedAt  DateTime?

  tournament Tournament       @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  matches    TournamentMatch[]

  @@unique([tournamentId, roundNumber])
  @@map("tournament_rounds")
}

model TournamentMatch {
  id           String       @id @default(uuid())
  roundId      String
  tournamentId String
  player1Id    String?      // fixed for the whole match — colors rotate per game
  player2Id    String?
  status       MatchStatus  @default(PENDING)
  result       MatchResult?

  // Running score — fields used depend on tournament format
  player1Wins        Int   @default(0)    // knockout: wins; points: not used for ranking
  player2Wins        Int   @default(0)
  player1ConsecLoss  Int   @default(0)    // knockout only — reset on win or draw
  player2ConsecLoss  Int   @default(0)    // knockout only
  player1GamePoints  Float @default(0)    // points format: game pts scored (0–3, e.g. 2.5)
  player2GamePoints  Float @default(0)    // points format: game pts scored (0–3)
  gamesPlayed        Int   @default(0)

  // Points to the currently active game (null when PENDING or COMPLETED).
  // Set by MatchProgressionService after each spawnGame call.
  currentGameId      String? @unique

  scheduledAt  DateTime?
  completedAt  DateTime?

  round  TournamentRound      @relation(fields: [roundId], references: [id], onDelete: Cascade)
  games  TournamentMatchGame[]

  @@map("tournament_matches")
}

// One row per individual game within a tournament match.
// The FK lives on Game.tournamentMatchGameId — TournamentMatchGame owns no game column.
model TournamentMatchGame {
  id         String           @id @default(uuid())
  matchId    String
  gameNumber Int
  isExtra    Boolean          @default(false)
  result     MatchGameResult?  // null while game is in progress; set when game ends

  match TournamentMatch @relation(fields: [matchId], references: [id], onDelete: Cascade)
  game  Game?           // back-reference; FK is on Game.tournamentMatchGameId

  @@unique([matchId, gameNumber])
  @@map("tournament_match_games")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum TournamentFormat {
  SINGLE_ELIMINATION
  DOUBLE_ELIMINATION
  SWISS
  ROUND_ROBIN
}

enum TournamentStyle {
  BLITZ
  RAPID
  CLASSICAL
  UNLIMITED
}

enum TournamentStatus {
  DRAFT
  REGISTRATION
  ACTIVE
  COMPLETED
  CANCELLED
}

enum TournamentScope {
  GLOBAL
  COUNTRY
  REGION
}

enum ParticipantStatus {
  REGISTERED
  ACTIVE
  ELIMINATED
  WITHDRAWN
}

enum RoundStatus {
  PENDING
  ACTIVE
  COMPLETED
}

enum MatchStatus {
  PENDING
  ACTIVE
  COMPLETED
  BYE
}

enum MatchResult {
  PLAYER1_WIN
  PLAYER2_WIN
  BYE
}

enum MatchGameResult {
  PLAYER1_WIN
  PLAYER2_WIN
  DRAW
}
```

### 9.2 Changes to Existing Schemas

**`game.prisma`** — Game owns the FK. Single source of truth for the 1:1 relation:
```prisma
// Add to Game model:
tournamentMatchGameId String?              @unique
tournamentMatchGame   TournamentMatchGame? @relation(fields: [tournamentMatchGameId], references: [id])
```
`TournamentMatchGame` has no `gameId` column. The link is navigated via `game.tournamentMatchGame` (forward) or `tournamentMatchGame.game` (back-reference from Prisma's virtual side).

**`user.prisma`** — extend `Rating`:
```prisma
// Add to Rating model:
matchmakingWins      Int  @default(0)   // ranked queue wins only
wins                 Int  @default(0)   // all game types (for profile display)
losses               Int  @default(0)
draws                Int  @default(0)
highestAiLevelBeaten Int?               // 0=BEGINNER … 6=MASTER
```

---

## 10. Backend Architecture

### 10.1 Domain Layer — New Files

```
backend/src/domain/tournament/
├── entities/
│   ├── tournament.entity.ts
│   ├── tournament-participant.entity.ts
│   ├── tournament-round.entity.ts
│   ├── tournament-match.entity.ts
│   └── tournament-match-game.entity.ts
├── services/
│   ├── bracket-generation.service.ts
│   ├── eligibility-check.service.ts
│   ├── match-progression.service.ts      # 3-game logic, consec loss, extra game
│   └── standings.service.ts
├── repositories/
│   └── tournament.repository.interface.ts
└── tournament.module.ts
```

### 10.2 `MatchProgressionService` — Core 3-Game Logic

#### Game creation timing — on-demand (lazy)

**Only Game 1 is created when a TournamentMatch is first created** (by `StartTournamentUseCase` or `AdvanceRoundUseCase`). Games 2, 3, and any extras are spawned one at a time, immediately after the previous game ends. No games are pre-created speculatively.

This means:
- A 2-0 early exit plays exactly 2 games — Game 3 is never created.
- Players receive a `tournamentMatchGameReady` notification for each game as it is spawned.
- `TournamentMatch.currentGameId` always points to the in-progress game. The "Join Game" button uses this field directly — no search needed.
- On reconnect, the frontend fetches `GET /tournaments/:id` which returns `currentGameId`, giving the player the right game to rejoin.

#### Progression algorithm

`MatchProgressionService` reads `tournament.format` to choose the correct path.

```
// Called once at match creation (by StartTournamentUseCase or AdvanceRoundUseCase):
spawnGame(matchId, gameNumber=1):
  color: odd gameNumber → player1=WHITE, player2=BLACK
         even gameNumber → player1=BLACK, player2=WHITE
  create Game entity (gameType=CASUAL, tournamentMatchGameId=newTournamentMatchGame.id)
  create TournamentMatchGame (matchId, gameNumber, isExtra = gameNumber > 3)
  set match.currentGameId = new game's id
  emit: tournamentMatchGameReady { matchId, gameId, gameNumber, isExtra, opponent }


// Called by ReportTournamentResultUseCase when a Game ends:
onGameComplete(matchId, gameResult: PLAYER1_WIN | PLAYER2_WIN | DRAW):

  load match + tournament.format
  set match.currentGameId = null
  gamesPlayed++

  ── POINTS MODE (Round Robin, Swiss) ──────────────────────────────

  1. Score the game:
     PLAYER1_WIN → player1GamePoints += 1.0
     PLAYER2_WIN → player2GamePoints += 1.0
     DRAW        → player1GamePoints += 0.5, player2GamePoints += 0.5

  2. If gamesPlayed < 3:
     spawnGame(matchId, gamesPlayed + 1)   ← always play all 3 games

  3. If gamesPlayed = 3:
     match.status = COMPLETED
     participant.totalGamePoints += player1GamePoints (for player1)
     participant.totalGamePoints += player2GamePoints (for player2)
     emit: tournamentMatchCompleted { matchId, score: "2.5–0.5" }
     if all matches in round complete → AdvanceRoundUseCase (Swiss) or update standings (RR)

  ── KNOCKOUT MODE (Single Elim, Double Elim) ──────────────────────

  1. Update win/consec counters:
     PLAYER1_WIN → player1Wins++, player1ConsecLoss=0, player2ConsecLoss++
     PLAYER2_WIN → player2Wins++, player2ConsecLoss=0, player1ConsecLoss++
     DRAW        → player1ConsecLoss=0, player2ConsecLoss=0

  2. Check consecutive-loss early exit:
     player2ConsecLoss >= 2 → result = PLAYER1_WIN, end match
     player1ConsecLoss >= 2 → result = PLAYER2_WIN, end match

  3. If gamesPlayed >= 3 and match still active:
     player1Wins > player2Wins → PLAYER1_WIN, end match
     player2Wins > player1Wins → PLAYER2_WIN, end match
     tied                      → spawnGame(matchId, gamesPlayed + 1)  ← extra game

  4. If gamesPlayed < 3 and match still active:
     spawnGame(matchId, gamesPlayed + 1)

  5. If match ended:
     match.status = COMPLETED, match.result, match.completedAt
     participant.matchWins++ (winner) / matchLosses++ (loser)
     emit: tournamentMatchCompleted { matchId, winnerId, score: "2–1" }
     if all matches in round complete → AdvanceRoundUseCase
```

### 10.3 Application Layer — New Use Cases

| Use Case | Trigger | Key Logic |
|---|---|---|
| `CreateTournamentUseCase` | `POST /tournaments` (admin) | Validate bilingual fields, save directly as REGISTRATION |
| `RegisterForTournamentUseCase` | `POST /tournaments/:id/register` | Run all 5 eligibility checks, snapshot ELO |
| `WithdrawFromTournamentUseCase` | `DELETE /tournaments/:id/register` | REGISTRATION status only |
| `StartTournamentUseCase` | `POST /tournaments/:id/start` (admin) | Lock bracket, seed by ELO, gen round 1 |
| `AdvanceRoundUseCase` | Auto — all round matches done | Gen next round, create match stubs |
| `ReportTournamentResultUseCase` | Auto — game ends | Call MatchProgressionService, update standings |
| `ListTournamentsUseCase` | `GET /tournaments` | Filter by scope/format/status/country |
| `GetTournamentUseCase` | `GET /tournaments/:id` | Bracket + standings + participants |

### 10.4 `BracketGenerationService` — Algorithm Detail

#### Single Elimination

```
1. Sort participants by eloAtSignup DESC → assign seed 1..N

2. Determine BYE count: k = ceil(log2(N)), BYEs = 2^k - N
   Top seeds receive BYEs: seeds 1..BYE_COUNT advance to round 2 immediately.
   Remaining seeds fill round 1 competitive slots.

   Example: 12 players → k=4, 16-slot bracket, 4 BYEs
   Seeds 1,2,3,4 receive BYEs (advance to round 2)
   Round 1 matches: seed 5 vs 12, seed 6 vs 11, seed 7 vs 10, seed 8 vs 9

3. Round 1 pairings (competitive slots only):
   lowest seed vs highest seed in each quarter, balanced across the bracket

4. BYE matches: status=BYE immediately, winner=top-seed player.
   BYE does NOT increment matchWins — shown as "BYE" in bracket, not "W".

5. Real matches: create TournamentMatch, immediately call spawnGame(matchId, gameNumber=1)

6. On each game end → MatchProgressionService → spawnGame or end match

7. On match end → check if all matches in round complete → AdvanceRoundUseCase
   AdvanceRoundUseCase: collect match winners → pair for next round →
   create TournamentMatch rows → spawnGame for each → emit tournamentRoundAdvanced
```

#### Round Robin

```
1. Use circle method (Berger tables) — all N*(N-1)/2 pairings generated upfront
2. Distribute across ceil(N-1) rounds
3. Create all TournamentMatch rows upfront; create Game 1 per match only
   as each round becomes ACTIVE (avoids flooding players with notifications)
4. Standings: rank by totalGamePoints DESC (cumulative game pts across all matches)
   Tiebreak: head-to-head game score → then total individual games won
5. Always 3 games per match — no early exits, no extras (Points Mode)
```

### 10.5 Modified Existing Files

| File | Change |
|---|---|
| `rating.service.ts` | RANKED win → increment `matchmakingWins` + `wins` |
| `rating.service.ts` | CASUAL/AI win → increment `wins` only |
| `end-game.use-case.ts` | AI win → update `highestAiLevelBeaten` if new record |
| `make-move.use-case.ts` | Game end + `tournamentMatchGameId` set → call `ReportTournamentResultUseCase` |
| `game.prisma` | Add `tournamentMatchGameId String? @unique` |
| `user.prisma` | Add 5 fields to `Rating` model |

### 10.5 REST API

```
GET    /tournaments                           List (filter: status, scope, country, region, format)
POST   /tournaments                           Admin: create (includes descriptionEn/Sw, rulesEn/Sw)
GET    /tournaments/:id                       Bracket + standings + participants + bilingual content
POST   /tournaments/:id/register              Player registers
DELETE /tournaments/:id/register              Player withdraws
POST   /tournaments/:id/start                 Admin: lock bracket, generate round 1
GET    /tournaments/:id/rounds/:roundNumber   Round detail + all match states
GET    /tournaments/:id/standings             Current / final standings
PATCH  /tournaments/:id/matches/:matchId     Admin: manual result override
```

### 10.6 WebSocket Events

| Event | Payload | Recipients |
|---|---|---|
| `tournamentMatchGameReady` | `{ matchId, gameId, gameNumber, isExtra, opponentId }` | Both players |
| `tournamentMatchCompleted` | `{ matchId, winnerId, score: "2-1" }` | Both players |
| `tournamentRoundAdvanced` | `{ tournamentId, roundNumber, bracket }` | All participants |
| `tournamentCompleted` | `{ tournamentId, winnerId, standings }` | All participants |

---

## 11. Eligibility Check Flow

```
1. SCOPE
   COUNTRY → user.country === tournament.country
   REGION  → user.country === tournament.country
             AND user.region === tournament.region

2. ELO RANGE
   tournament.minElo → rating.rating >= minElo
   tournament.maxElo → rating.rating <= maxElo

3. ONLINE MATCHMAKING WINS (ranked queue only)
   tournament.minMatchmakingWins → rating.matchmakingWins >= minMatchmakingWins

4. AI LEVEL BEATEN
   tournament.minAiLevelBeaten → rating.highestAiLevelBeaten >= minAiLevelBeaten

5. AI LEVEL PLAYED
   tournament.requiredAiLevelPlayed →
     EXISTS (SELECT 1 FROM games
             WHERE (whitePlayerId = userId OR blackPlayerId = userId)
               AND gameType = 'AI'
               AND aiLevel = requiredAiLevelPlayed)
```

Failure response:
```json
{
  "eligible": false,
  "failedCheck": "MATCHMAKING_WINS",
  "required": 20,
  "current": 7,
  "message": "You need 20 ranked matchmaking wins to enter. You have 7."
}
```

---

## 12. Community Page

Tournaments live under `/community` — TzDraft's social and competitive hub.

### 12.1 Community Page Purpose

The community page aggregates everything social on TzDraft in one place:
- **Featured tournament** — the next upcoming or currently active tournament
- **Tournament list** — browseable, filterable list of all tournaments
- **Leaderboard preview** — top 5 players globally and regionally
- **Active players** — real-time count of players currently online

This is the page that gets linked from the navbar and is the primary entry point for competitive play discovery.

### 12.2 URL Structure

```
/[locale]/community                              Community hub (featured tournament + leaderboard + activity)
/[locale]/community/tournament                   Full tournament list (filterable)
/[locale]/community/tournament/[id]              Tournament detail — public, SEO-indexed
/[locale]/community/tournament/[id]/register     Registration (authenticated only)
```

Admin paths remain separate:
```
/[locale]/admin/tournament                       Admin tournament list
/[locale]/admin/tournament/create               Create new tournament
/[locale]/admin/tournament/[id]/manage          Manage tournament
```

### 12.3 Community Hub Layout

```
┌─────────────────────────────────────────────────────────────┐
│  COMMUNITY                                                  │
│  Connect, compete, and rank up with Tanzanian players       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌────────────────────────┐│
│  │  FEATURED TOURNAMENT        │  │  LEADERBOARD (top 5)  ││
│  │  Dodoma Regional Open 2026  │  │  1. Amina Yusuf  1842 ││
│  │  [REGISTRATION OPEN]        │  │  2. John Mwangi  1790 ││
│  │  Starts Apr 1 · 16 players  │  │  3. Baraka Ali   1755 ││
│  │  Single Elim · Rapid        │  │  ...                  ││
│  │  [Register Now]             │  │  [Full Leaderboard →] ││
│  └─────────────────────────────┘  └────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ALL TOURNAMENTS                    [Filter: Status ▼] ...  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Mwanza Open │ │ Tanzania    │ │ Beginner    │          │
│  │ ACTIVE      │ │ Nationals   │ │ Series      │          │
│  │ Regional    │ │ COMING SOON │ │ REGISTRATION│          │
│  │ 32 players  │ │ Country     │ │ 8 players   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. Tournament Detail Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│  [← Community]                                                 │
│                                                                │
│  Dodoma Regional Open 2026               [REGISTRATION OPEN]  │
│  Regional — Dodoma, Tanzania  ·  Single Elimination  ·  Rapid │
│  Starts April 1, 2026  ·  12 / 16 players registered          │
│                                                                │
│  ─── ABOUT ──────────────────────────────────────────────     │
│  [descriptionEn / descriptionSw based on locale]              │
│                                                                │
│  ─── RULES ──────────────────────────────────────────────     │
│  [rulesEn / rulesSw if set, else link to /rules]              │
│                                                                │
│  ─── ELIGIBILITY ────────────────────────────────────────     │
│  ✓ Country: Tanzania  ✓ Region: Dodoma                        │
│  ✓ ELO: 1342 (min: 1200)  ✗ Ranked wins: 7 (need 20)        │
│  [Not eligible — play more ranked matches]                    │
│                              OR if eligible: [Register Now]   │
│                                                               │
│  ─── BRACKET (knockout) / STANDINGS TABLE (points) ─────     │
│                                                               │
│  Knockout → BracketView with [W][L] chips per match           │
│                                                               │
│  Points →  # │ Player       │ Game Pts │ Matches │ Tiebreak  │
│             1 │ Amina Yusuf  │  8.5/12  │  4W 0L  │  18.5    │
│             2 │ John Mwangi  │  7.0/12  │  3W 1L  │  16.0    │
│                                                               │
│  ─── MY MATCHES ─────────────────────────────────────────     │
│  Knockout:  Round 1 vs. John Mwangi  [W][W]  2–0  ✓          │
│             Round 2 vs. Fatuma Ali   [W][L][ ] → [Join G3]   │
│                                                               │
│  Points:    Round 1 vs. John Mwangi  [W][D][L]  1.5  ✓       │
│             Round 2 vs. Fatuma Ali   [W][ ][ ]  → [Join G2]  │
└────────────────────────────────────────────────────────────────┘
```

---

## 14. SEO Plan

The tournament system is a major SEO opportunity. Tournament pages are public, unique, content-rich pages that can rank for search queries like "Tanzania Drafti tournament", "Dodoma drafti competition 2026", etc.

### 14.1 SEO Patterns — Existing Project Standards

The project uses:
- `generateMetadata()` in `layout.tsx` per route — canonical URL, OG tags, twitter card
- `JsonLd` component for Schema.org structured data
- `BreadcrumbJsonLd` for breadcrumb structured data
- `frontend/src/lib/seo.ts` helpers: `getCanonicalUrl`, `getLanguageAlternates`, `getSiteUrl`
- Bilingual (`sw`/`en`) metadata with locale-specific titles and descriptions

All new tournament/community pages follow the same patterns.

### 14.2 Community Hub — `/community`

**`frontend/src/app/[locale]/community/layout.tsx`**

```typescript
// Locale metadata
const meta = {
  sw: {
    title: "Jumuiya | Mashindano ya Drafti Tanzania",
    description:
      "Jiunge na jumuiya ya TzDraft — angalia mashindano yanayoendelea, orodha ya bingwa, na wachezaji wa Tanzania.",
  },
  en: {
    title: "Community | Tanzania Drafti Tournaments & Rankings",
    description:
      "Join the TzDraft community — browse active tournaments, see the leaderboard, and connect with Tanzanian Drafti players.",
  },
}

// JSON-LD: WebPage + BreadcrumbList
{
  "@type": "WebPage",
  "name": "TzDraft Community",
  "description": "...",
  "breadcrumb": { ... }
}
```

**Sitemap priority:** `0.8` — high-value community hub.

### 14.3 Tournament List — `/community/tournament`

**`frontend/src/app/[locale]/community/tournament/layout.tsx`**

```typescript
const meta = {
  sw: {
    title: "Mashindano ya Drafti Tanzania | TzDraft",
    description:
      "Tazama mashindano yote ya Drafti mtandaoni Tanzania — mashindano ya mkoa, kitaifa, na ya kimataifa.",
  },
  en: {
    title: "Tanzania Drafti Tournaments | TzDraft",
    description:
      "Browse all Tanzania Drafti tournaments online — regional, national, and global competitions on TzDraft.",
  },
}

// JSON-LD: ItemList of tournaments
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Tanzania Drafti Tournaments",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "url": "/en/community/tournament/[id]", "name": "Dodoma Open 2026" },
    ...
  ]
}
```

**Sitemap priority:** `0.8`, `changeFrequency: "daily"` (new tournaments appear frequently).

### 14.4 Tournament Detail — `/community/tournament/[id]`

This is the most SEO-valuable page in the tournament system. Each tournament gets a unique, fully-indexed page.

**`frontend/src/app/[locale]/community/tournament/[id]/page.tsx`** uses `generateMetadata`:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { locale, id } = await params
  const tournament = await fetchTournament(id)

  const title = tournament.name
  const description = locale === 'sw' ? tournament.descriptionSw : tournament.descriptionEn
  const canonical = getCanonicalUrl(locale, `/community/tournament/${id}`, siteUrl)

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: getLanguageAlternates(`/community/tournament/${id}`, siteUrl),
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      locale,
      images: ["/logo/logo.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}
```

**JSON-LD: `SportsEvent` schema** (most specific schema for a tournament):

```typescript
const tournamentSchema = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": tournament.name,
  "description": locale === 'sw' ? tournament.descriptionSw : tournament.descriptionEn,
  "sport": "Tanzania Draughts",
  "startDate": tournament.scheduledStartAt,
  "eventStatus": mapStatusToSchema(tournament.status),
  // REGISTRATION_OPEN → EventMovedOnline, ACTIVE → EventScheduled, COMPLETED → EventScheduled
  "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
  "location": {
    "@type": "VirtualLocation",
    "url": canonical
  },
  "organizer": {
    "@type": "Organization",
    "name": "TzDraft",
    "url": "https://www.tzdraft.co.tz"
  },
  "url": canonical,
  "image": "/logo/logo.png",
  "maximumAttendeeCapacity": tournament.maxPlayers,
  "remainingAttendeeCapacity": tournament.maxPlayers - participantCount,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "TZS",
    "availability": "https://schema.org/InStock",
    "validFrom": tournament.createdAt,
    "validThrough": tournament.registrationDeadline
  }
}
// + BreadcrumbList: Home → Community → Tournaments → [Tournament Name]
```

**Sitemap:** Tournament detail pages are dynamically generated:

```typescript
// Add to frontend/src/app/sitemap.ts
const tournaments = await fetchPublicTournaments()  // REGISTRATION + ACTIVE + COMPLETED
for (const t of tournaments) {
  for (const locale of routing.locales) {
    items.push({
      url: new URL(`/${locale}/community/tournament/${t.id}`, siteUrl).toString(),
      lastModified: t.updatedAt,
      changeFrequency: t.status === 'ACTIVE' ? 'hourly' : 'daily',
      priority: t.status === 'ACTIVE' ? 0.9 : 0.7,
    })
  }
}
```

### 14.5 Registration Page — `/community/tournament/[id]/register`

**Not indexed.** Authenticated users only.

```typescript
// robots.ts — add to disallow list:
"/sw/community/tournament/",  // disallow ALL tournament sub-paths? No — only /register
// Better: disallow only register sub-path
"/*/community/tournament/*/register"
```

Actually, tournament list and detail ARE public and should be indexed. Only `/register` is disallowed. Update `robots.ts` to be precise.

### 14.6 Robots.txt Updates

Current disallow list:
```
/sw/auth/, /en/auth/, /sw/game/, /en/game/, /sw/admin/, /en/admin/, /studio/
```

Add:
```
/sw/community/tournament/*/register
/en/community/tournament/*/register
```

Keep `/community`, `/community/tournament`, `/community/tournament/[id]` **crawlable**.

### 14.7 Sitemap Updates

Update `frontend/src/app/sitemap.ts`:

```typescript
// Add to publicPaths:
const publicPaths = [
  "", "/play", "/rules", "/policy", "/support", "/learn",
  "/community",           // new
  "/community/tournament" // new
]

// New dynamic section — tournament detail pages:
const tournaments = await fetchPublicTournaments()
for (const t of tournaments) {
  for (const locale of routing.locales) {
    items.push({
      url: new URL(`/${locale}/community/tournament/${t.id}`, siteUrl).toString(),
      lastModified: t.updatedAt,
      changeFrequency: t.status === 'ACTIVE' ? 'hourly' : 'daily',
      priority: t.status === 'ACTIVE' ? 0.9 : 0.7,
    })
  }
}
```

### 14.8 SEO Priority Summary

| Page | Priority | Change Freq | Indexed |
|---|---|---|---|
| `/community` | 0.8 | weekly | Yes |
| `/community/tournament` | 0.8 | daily | Yes |
| `/community/tournament/[id]` (ACTIVE) | 0.9 | hourly | Yes |
| `/community/tournament/[id]` (UPCOMING/DONE) | 0.7 | daily | Yes |
| `/community/tournament/[id]/register` | — | — | No |

---

## 15. Frontend Architecture

### 15.1 Pages

```
frontend/src/app/[locale]/
├── community/
│   ├── layout.tsx                              # Community SEO metadata
│   ├── page.tsx                                # Hub: featured tournament + leaderboard preview
│   └── tournament/
│       ├── layout.tsx                          # Tournament list SEO metadata
│       ├── page.tsx                            # Tournament list — browseable, filterable
│       └── [id]/
│           ├── page.tsx                        # Tournament detail (generateMetadata + SportsEvent JSON-LD)
│           └── register/
│               └── page.tsx                    # Registration: eligibility preview + confirm
└── admin/
    └── tournament/
        ├── page.tsx                            # Admin: list + manage
        ├── create/page.tsx                     # Create form (bilingual description/rules fields)
        └── [id]/manage/page.tsx               # Start, monitor, override results
```

### 15.2 Components

```
frontend/src/components/tournament/
├── BracketView.tsx           # Visual elimination bracket (real-time via WS)
├── StandingsTable.tsx        # Points table for Round Robin / Swiss
├── TournamentCard.tsx        # List card: name, scope badge, format, status, player count
├── TournamentMatchCard.tsx   # Match card: players, per-game chips, "Join Game" button
├── MatchScoreChips.tsx       # [W][L][D] chips showing each game result
├── EligibilityGate.tsx       # Pass/fail display for all 5 filters
├── ScopeTag.tsx              # "Regional — Dar es Salaam" badge
└── TournamentFilters.tsx     # Scope, format, status filter bar
```

### 15.3 Hooks

```
frontend/src/hooks/
├── useTournament.ts              # Fetch bracket + standings + bilingual content + WS events
├── useTournamentList.ts          # Paginated list with filter params
└── useTournamentRegistration.ts  # Register/withdraw state + eligibility result
```

### 15.4 Service

```
frontend/src/services/tournament.service.ts
```

---

## 16. Admin View

### Create Tournament Form

```
Name *                [________________________]

Description (English) *
[                                              ]
[                                              ]

Description (Swahili) *
[                                              ]
[                                              ]

Rules (English)         [optional]
[                                              ]

Rules (Swahili)         [optional]
[                                              ]

Format *              [Single Elimination ▼]
Style *               [Rapid ▼]
Scope *               [Country ▼]
  Country             [Tanzania ▼]
  Region              [Dodoma ▼]             (if Scope = REGION)

Max Players *         [16]
Min Players           [4]
Registration Deadline [date/time picker]
Scheduled Start *     [date/time picker]

─── Eligibility Filters ──────────────────────
Min ELO               [____]   Max ELO        [____]
Min Ranked Wins       [____]   (online matchmaking only — AI and casual do not count)
Min AI Level Beaten   [None ▼]
Must Have Played AI   [None ▼]

Note: Tournament games never affect ladder rating (ELO Impact is always off)
```

### Manage Tournament Page

- Registered players list with eligibility status
- "Start Tournament" button (disabled if below `minPlayers`)
- Live bracket / standings view
- Per-match game result override (for disconnections / disputes)
- "Cancel Tournament" with confirmation modal

---

## 17. Phase Delivery Plan

### Phase 1 — Current Delivered Tournament Product

**Product statement:**

Phase 1 currently delivers **admin-run single-elimination tournaments** with public listing/detail pages, registration and withdrawal, eligibility filters, live bracket progression, and manual admin controls for moderation and match resolution.

**What is implemented now:**

- Single Elimination only
- Public tournament list and detail page
- Admin create page
- Admin monitor/manage page
- Registration and withdrawal during open registration window
- Scope + ELO + matchmaking wins + AI eligibility filters
- Seed assignment from signup ELO snapshot
- Round 1 bracket generation with BYEs
- Best-of-3 knockout match progression with extra games
- WebSocket updates for match-ready, match-complete, round-advanced, tournament-completed
- Manual participant removal before start
- Manual tournament cancel before start
- Manual admin result override for stuck matches
- Tournament games excluded from ladder ELO updates

**Not yet implemented in current code:**

- Round Robin
- automatic scheduled start/cancel worker
- dedicated registration route
- organizer role
- standings service for points-based formats

**Database:**
- [x] `tournament.prisma` — 5 new models + enums (includes bilingual description/rules fields)
- [x] Migration: tournament tables + `tournamentMatchGameId` on Game
- [x] Existing rating data reused for eligibility and tournament ELO isolation

**Backend:**
- [x] Tournament domain entities (5 files)
- [x] `EligibilityCheckService` — scope, ELO, ranked wins, AI checks
- [x] `BracketGenerationService` — Single Elim
- [x] `MatchProgressionService` — 3-game logic, consecutive loss, extra game
- [ ] `StandingsService` — points + tiebreak
- [x] `ITournamentRepository` + `PrismaTournamentRepository`
- [x] Tournament use cases for create, list, get, register, withdraw, start, advance round, report result
- [x] Admin use cases for update, cancel, participant removal, manual result override
- [x] `TournamentController` endpoints for public, player, and admin flows
- [x] `rating.service.ts` tournament guard so tournament games do not affect ladder ELO
- [x] `end-game.use-case.ts` integration with tournament result reporting
- [x] WebSocket tournament events

**Frontend + SEO:**
- [x] Tournament list page (`/community/tournament`)
- [x] Tournament detail page with registration and live updates
- [ ] Dedicated registration page (current registration lives on the detail page)
- [x] Admin create + manage pages
- [ ] `BracketView`, `StandingsTable`, `TournamentCard`, `MatchScoreChips`, `EligibilityGate` extracted component architecture
- [x] `useTournament`
- [x] `tournament.service.ts`
- [ ] Scaled public-list SEO/data-loading pass
- [ ] Sitemap and robots refinements
- [ ] Community hub tournament integration polish

### Phase 2 — Swiss System + Organizer Role

- [ ] Swiss pairing + Buchholz tiebreak
- [ ] ORGANIZER user role (non-admin tournament creators)
- [ ] Round-by-round pairing UI

### Phase 3 — Double Elimination + Notifications

- [ ] Double elimination bracket logic
- [ ] Email/SMS notifications on match game ready (infra exists)
- [ ] Tournament history on player profile page

---

## 18. Open Decisions

| Decision | Options | Recommendation |
|---|---|---|
| ELO snapshot at registration | Snapshot vs. live | **Snapshot** — prevents manipulation |
| BYE handling | Top or bottom seeds / counts as win | **Top seeds receive BYEs** (not bottom). A BYE = advancement to next round only — it does NOT add to `matchWins` in standings and is displayed as "BYE" not "W" in bracket view |
| Disconnection in a match game | Auto-forfeit that game / admin override | **Auto-forfeit that game** (match continues) |
| Max extra games | No limit / cap | **No limit** — play until winner |
| Tournament name language | Translated / single string | **Single string** — proper noun, e.g. "Dodoma Open 2026" |
| Navbar link label | "Community" / "Tournaments" | **"Community"** — broader hub |

---

## 19. File Count Summary

| Layer | New Files | Modified Files |
|---|---|---|
| Prisma schema | 1 | 2 |
| Backend domain | 9 | 0 |
| Backend application | 8 | 3 |
| Backend infrastructure | 1 | 0 |
| Backend interface | 2 | 0 |
| Frontend pages | 8 | 0 |
| Frontend layouts (SEO) | 3 | 0 |
| Frontend components | 8 | 0 |
| Frontend hooks + service | 4 | 0 |
| Frontend sitemap + robots | 0 | 2 |
| **Total** | **44** | **7** |
