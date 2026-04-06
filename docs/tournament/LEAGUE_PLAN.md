# TzDraft League System — Design Document

**Status:** Planning
**Date:** 2026-04-05
**Version:** v1.0 — 2 games per match (upgradeable to 3 games in future)

---

## 1. Overview

A **football-style league** for Tanzania Draughts. 12 players compete in a full round-robin where every player faces every other player in a **match**. Each match consists of **2 games** — one as White, one as Black — guaranteeing perfect color balance. Goals (individual game wins) are recorded and used for Goal Difference (GD) in standings.

> **Future upgrade path:** Match format can be extended to 3 games per match without restructuring the data model — `LeagueGame.gameNumber` already supports it. Only match completion logic needs updating.

---

## 2. Format

| Property | Value |
|---|---|
| Players | 12 |
| Format | Single round-robin |
| Rounds | 11 |
| Matches per round | 6 (all played simultaneously) |
| Games per match | 2 |
| Total matches | 66 |
| Total games | 132 |
| Estimated season length | 5–6 weeks |

---

## 3. Match Structure

### 3.1 What is a Match

A match is **2 games** between two players. Both players must complete both games before the **match deadline** expires.

### 3.2 Color Assignment (Perfect Balance)

```
Game 1: Player A = White,  Player B = Black
Game 2: Player A = Black,  Player B = White
```

Every player gets **exactly one White and one Black** per match — no color advantage.

### 3.3 Goals

Each game result contributes goals to the match score:

| Game Result | Player A Goals | Player B Goals |
|---|---|---|
| Player A wins | +1 | +0 |
| Player B wins | +0 | +1 |
| Draw | +0.5 | +0.5 |

Goals are recorded and accumulated across all matches into the standings GF/GA/GD columns.

### 3.4 Match Outcomes

| Match Score | Result | A Pts | B Pts |
|---|---|---|---|
| 2-0 | A wins | 3 | 0 |
| 0-2 | B wins | 0 | 3 |
| 1-1 | Draw | 1 | 1 |
| 1.5-0.5 | A wins | 3 | 0 |
| 0.5-1.5 | B wins | 0 | 3 |
| 0.5-0.5 (both draw) | Draw | 1 | 1 |

### 3.5 Forfeit / Walkover

If a game within a match is forfeited (disconnection, timeout, no-show):

```
Forfeited game → forfeit player gets 0 goals, opponent gets 1 goal
Match score recalculated from completed + forfeited game results
```

---

## 4. Schedule Generation

### 4.1 Algorithm — Circle Method

Fix Player 1, rotate the remaining 11 players around it each round. This guarantees every pair meets exactly once across 11 rounds.

```
Round 1:  P1 vs P12 | P2 vs P11 | P3 vs P10 | P4 vs P9 | P5 vs P8 | P6 vs P7
Round 2:  P1 vs P11 | P12 vs P10 | P2 vs P9  | P3 vs P8 | P4 vs P7 | P5 vs P6
...
Round 11: P1 vs P2  | P3 vs P12  | P4 vs P11 | P5 vs P10 | P6 vs P9 | P7 vs P8
```

The full 66-match schedule is **pre-generated at league start** and stored in the database.

### 4.2 Round Deadlines

Each round has a fixed deadline window (configurable, default 7 days per round):

```
Round 1 deadline:  startDate + 7 days
Round 2 deadline:  startDate + 14 days
...
Round 11 deadline: startDate + 77 days
```

Players complete their 2-game match **anytime within the round window**. Game 2 is auto-created as soon as Game 1 finishes.

---

## 5. Winner Determination

### 5.1 Match Winner

A match has 2 games. The winner is determined from the total goals:

```
Player A goals > Player B goals → Player A wins the match (3 pts, 0 pts)
Player A goals < Player B goals → Player B wins the match (0 pts, 3 pts)
Player A goals = Player B goals → Match is a DRAW (1 pt each)
```

Possible goal totals per match: `2-0`, `1.5-0.5`, `1-1`, `0.5-1.5`, `0-2`

Only `1-1` and `0.5-0.5` are draws. Everything else has a clear winner.

---

### 5.2 League Winner

At the end of Round 11, the player with the **most match points** wins the league.

If two or more players are level on points, the winner is decided by the following tiebreakers **in order**:

| Step | Tiebreaker | Description |
|---|---|---|
| 1 | Match Points | Most points wins |
| 2 | Goal Difference (GD) | GF minus GA across all matches |
| 3 | Goals For (GF) | Most total goals scored |
| 4 | Head-to-head result | Result of the match between the tied players |
| 5 | Head-to-head GD | Goal difference in that specific match |
| 6 | Admin decision | Playoff game or coin toss (last resort) |

### 5.3 Example

```
Final standings (tied on points):

Player   Pts   GF     GA     GD    H2H
Alice    25    18.0   7.0   +11.0   —
Bob      25    16.5   8.5    +8.0   —

→ GD decides: Alice wins the league (+11.0 > +8.0)
```

```
Player   Pts   GF     GA    GD    H2H result
Alice    25    15.0   8.0  +7.0   Alice 1 - 1 Bob (draw)
Bob      25    15.0   8.0  +7.0   same

→ H2H result: draw → H2H GD: 0 → Admin decision (playoff)
```

---

## 6. Standings Table

### 6.1 Columns

```
#  Player     MP  W  D  L  GF    GA    GD    Pts
1  Alice        8  6  1  1  13.0   4.0  +9.0   19
2  Bob          8  5  1  2  11.0   6.5  +4.5   16
3  Charlie      8  4  2  2   9.5   8.5  +1.0   14
...
```

| Column | Meaning |
|---|---|
| MP | Matches Played |
| W | Match Wins |
| D | Match Draws |
| L | Match Losses |
| GF | Goals For — total game wins (including 0.5 for draws) across all matches |
| GA | Goals Against — total game wins conceded |
| GD | Goal Difference — GF minus GA |
| Pts | Match Points (W×3 + D×1) |

### 6.2 Tiebreakers (in order)

1. Match Points
2. Goal Difference (GD)
3. Goals For (GF)
4. Head-to-head match result between tied players
5. Head-to-head GD between tied players

---

## 6. Player Quit / Inactive Policy

### 6.1 Threshold Rule

The league uses a **50% threshold** to determine how to handle a player who stops participating.

| Matches Played | Action |
|---|---|
| < 6 (less than half) | **Expunge** — all results voided, player removed from table |
| ≥ 6 (half or more) | **Forfeit remaining** — completed results stand |

### 6.2 Expunge (< 6 matches played)

- All completed match results involving the quitting player are **voided**
- Opponents who beat them lose those points and goals
- Opponents who lost to them also lose those records
- Remaining unplayed opponents receive a **BYE** (no match, no points)
- Player is removed from the standings table entirely

**Why:** Fewer than half the league has a fair result. Expunging is fairer to the 7+ players who never played them.

### 6.3 Forfeit Remaining (≥ 6 matches played)

- All completed matches → **results stand**
- All remaining unplayed matches → **FORFEITED**: opponent receives a 2-0 walkover (2 goals, 3 pts)
- Quitting player stays in the table but sinks to the bottom

**Why:** Majority of players have a legitimate result. Voiding penalizes players who earned their wins.

### 6.4 Mid-Match Quit (between Game 1 and Game 2)

```
Game 1: completed → result and goals stand
Game 2: not played → quitter gets 0 goals, opponent gets 1 goal (forfeit)

Match score recalculated from Game 1 result + forfeit goal.
```

### 6.5 Inactivity Detection

| Event | Action |
|---|---|
| Missed 1 match deadline | Match forfeited, warning issued |
| Missed 2 consecutive match deadlines | Marked INACTIVE |
| INACTIVE + < 6 matches played | Auto-expunge |
| INACTIVE + ≥ 6 matches played | Forfeit all remaining matches |

### 6.6 Player Status Values

```
ACTIVE       → playing normally
INACTIVE     → missed 2+ consecutive deadlines
DISQUALIFIED → manually removed by admin
WITHDRAWN    → player self-requested exit
```

---

## 7. Network Error / Disconnection Handling

### 7.1 Core Principle

**A network error must never end a game or a match.** Every move is persisted to the database immediately. The game state can always be restored on reconnection.

### 7.2 Reconnection Window

```
Player disconnects mid-game
    ↓
Game is PAUSED (turn timer stops)
    ↓
3-minute reconnection window opens (stored in Redis with TTL)
    ↓
Player reconnects → board restored from DB → timer resumes
    ↓
If window expires → that game is forfeited (disconnected player gets 0 goals)
```

### 7.3 What the Opponent Sees

```
┌─────────────────────────────────────┐
│  Opponent disconnected              │
│  Waiting for reconnection...        │
│  ⏱ 2:43 remaining                  │
│                                     │
│  [Claim forfeit after timer ends]   │
└─────────────────────────────────────┘
```

The opponent can wait the full 3 minutes or manually claim the forfeit early — their choice.

### 7.4 Match Deadline Compensation

If a disconnection occurs due to a network error (not a deliberate quit), the match deadline is **automatically extended** by the duration of the disconnection.

```
disconnection_duration = reconnectedAt - disconnectedAt
match.deadline += disconnection_duration
```

### 7.5 Disconnection Outcomes Per Game

| Situation | Outcome |
|---|---|
| Reconnects within 3 minutes | Game resumes, no penalty |
| Does not reconnect (window expires) | Game forfeited — disconnected player gets 0 goals, opponent gets 1 |
| Opponent claims forfeit early | Same result |
| Other game in the match | Completely unaffected |

### 7.6 Match Integrity Example

```
Match: Player A (White) vs Player B (Black) — 2 games

Game 1: A wins → score 1-0
Game 2 (A=Black, B=White): A disconnects
  ├─ Reconnects within 3 min → game resumes → A wins → 2-0, A wins match (3 pts)
  ├─ Does not reconnect → Game 2 forfeited → 1-1, match is a draw (1 pt each)
  └─ B claims forfeit early → 1-1, same draw result
```

---

## 8. Data Model

### 8.1 Core Tables

```
League
  id
  name
  status              REGISTRATION | ACTIVE | COMPLETED
  startDate
  endDate
  maxPlayers          (default: 12)
  currentRound        (1-11)
  roundDurationDays   (default: 7)

LeagueParticipant
  leagueId
  userId
  status              ACTIVE | INACTIVE | DISQUALIFIED | WITHDRAWN
  matchPoints         (0..33)
  matchWins
  matchDraws
  matchLosses
  matchesPlayed
  goalsFor            (sum of game wins across all matches, supports 0.5 for draws)
  goalsAgainst        (sum of game wins conceded)
  goalDifference      (goalsFor - goalsAgainst)

LeagueRound
  id
  leagueId
  roundNumber         (1-11)
  status              PENDING | ACTIVE | COMPLETED
  deadline

LeagueMatch
  id
  leagueId
  roundId
  player1Id
  player2Id
  status              SCHEDULED | IN_PROGRESS | COMPLETED | FORFEITED | VOIDED
  deadline
  player1Goals        (0..2, supports 0.5 increments for draws)
  player2Goals        (0..2)
  result              PLAYER1_WIN | PLAYER2_WIN | DRAW | PENDING
  forfeitedBy         userId | null
  voidReason          string | null   ('PLAYER_EXPELLED' if expunged)

LeagueGame
  id
  matchId
  leagueId
  gameNumber          (1 or 2)
  whitePlayerId       (alternates: Game 1 = player1 is White, Game 2 = player2 is White)
  blackPlayerId
  gameId              → Game entity
  status              PENDING | IN_PROGRESS | COMPLETED | FORFEITED
  result              WHITE_WIN | BLACK_WIN | DRAW | PENDING
  goalsAwarded        (1 for win, 0.5 for draw, 0 for loss/forfeit)
  forfeitedBy         userId | null

DisconnectionEvent
  id
  matchId
  gameId
  playerId
  disconnectedAt
  reconnectedAt       (null if forfeited)
  forfeitedAt         (null if reconnected)
  duration            (seconds)
```

---

## 9. Redis Keys

```
game:session:{gameId}              → current board + whose turn (snapshot)
game:disconnect:{gameId}:{userId}  → TTL 180s (reconnection window)
match:deadline:{matchId}           → deadline timestamp (adjustable)
league:online:{leagueId}           → set of currently online player IDs
```

---

## 10. WebSocket Events

```
league:online               → player joined league presence room
league:offline              → player left
league:members              → broadcast current online members

game:opponent_disconnected  → notify opponent of disconnection + countdown
game:opponent_reconnected   → notify opponent of reconnection
game:reconnect_expired      → notify both players window expired
game:forfeited              → game forfeited, goals updated
match:game2_ready           → Game 1 done, Game 2 is now available to start
match:completed             → both games done, match result + goals finalized
league:standings_updated    → broadcast updated standings table
```

---

## 11. Backend Endpoints

```
POST   /leagues                                  → create league
POST   /leagues/:id/join                         → register (up to 12)
POST   /leagues/:id/start                        → admin starts, generates schedule
GET    /leagues/:id/standings                    → live league table (MP/W/D/L/GF/GA/GD/Pts)
GET    /leagues/:id/rounds/:n                    → 6 matches in a round
GET    /leagues/:id/schedule                     → full 11-round fixture list
GET    /leagues/:id/my-matches                   → current player's upcoming + completed matches
GET    /leagues/:id/matches/:matchId             → match detail + 2 games + goals
POST   /leagues/:id/matches/:matchId/start-game  → start next game in match (Game 1 or 2)
PATCH  /leagues/:id/rounds/:n/advance            → admin manually advances round
```

---

## 12. Cron Jobs

| Job | Interval | Action |
|---|---|---|
| Check match deadlines | Every hour | Forfeit expired matches, update goals + standings |
| Check reconnection windows | Every 30 seconds | Expire disconnection timers, forfeit games |
| Advance rounds | Daily | Auto-advance if all 6 matches in round are done |
| Inactivity sweep | Daily | Flag INACTIVE players, trigger expunge/forfeit logic |

---

## 13. Frontend Pages

```
/league/[id]                → standings table (MP/W/D/L/GF/GA/GD/Pts) + current round
/league/[id]/schedule       → full 11-round fixture grid
/league/[id]/round/[n]      → 6 matches of that round + live scores
/league/[id]/matches/[id]   → single match: 2 games, goals, deadline countdown
/league/create              → create league + invite players
/league/[id]/rules          → league rules and forfeit policy
```

---

## 14. Key Design Decisions

| Decision | Rationale |
|---|---|
| 2 games per match | Each player gets exactly one White and one Black — perfect color balance |
| Goals tracked per game | Accumulated into GF/GA/GD for standings tiebreakers, mirrors football |
| 0.5 goals for a draw | Draws count fractionally — rewards fighting for a win |
| Football-style standings | Familiar format players understand immediately |
| 50% threshold for expunge/forfeit | Standard professional league policy (UEFA/FIFA) |
| Reconnection window 3 minutes | Long enough for genuine errors, short enough not to stall matches |
| Deadline auto-extension on disconnect | Protects players from ISP/power issues outside their control |
| Pre-generate full schedule at start | Prevents disputes; all fixtures known upfront |
| Game 2 auto-created after Game 1 | Smooth UX — no manual action needed between games |
