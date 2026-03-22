# TzDraft Tournament Product Flow

> **Status:** Current implementation map
> **Date:** 2026-03-22
> **Scope:** Phase 1 live flow

---

## 1. What Phase 1 Is Today

Phase 1 currently delivers a playable single-elimination tournament product with:

- admin-created tournaments
- public community listing and detail pages
- player registration and withdrawal during the registration window
- eligibility checks at registration time
- ELO-based seeding
- best-of-3 knockout matches with extra games on ties
- live round and match updates over WebSocket
- admin moderation tools before and during play

Phase 1 does not yet ship:

- Round Robin gameplay
- Swiss pairing
- Double Elimination
- automatic scheduled start/cancel job
- dedicated registration sub-page
- organizer role outside admin

---

## 2. Product Flow

### 2.1 Admin Publishes Tournament

1. Admin opens the tournament admin area.
2. Admin enters bilingual description, optional bilingual rules, style, scope, player limits, schedule, and eligibility filters.
3. Admin submits the form.
4. Tournament is created immediately in `REGISTRATION`.
5. Tournament appears in the admin control room and public community surfaces.

### 2.2 Player Discovers Tournament

1. Player browses `/community/tournament`.
2. Player sees card-level signals for name, format, status, player count, and start time.
3. Player opens the tournament detail page.
4. The detail page shows localized description, rules, eligibility requirements, participants, and started rounds if available.

### 2.3 Player Registers

1. Authenticated player clicks `Register now`.
2. Backend validates:
   - tournament exists
   - registration window is still open
   - tournament is not full
   - player is not already registered
   - scope restrictions pass
   - ELO filter passes
   - ranked win filter passes
   - AI requirements pass
3. The player's current ELO is snapshotted into the participant record.
4. The player is added to the tournament.
5. Frontend refreshes the detail page and confirms registration.

### 2.4 Player Withdraws

1. Registered player clicks `Withdraw from tournament`.
2. Withdrawal is allowed only while registration is still open.
3. The participant row is removed.
4. Capacity opens back up immediately.

### 2.5 Admin Starts Tournament

1. Admin opens the tournament monitor page.
2. Admin reviews joined players and clicks `Start tournament`.
3. Backend:
   - verifies `REGISTRATION` status
   - checks `minPlayers`
   - cancels immediately if below minimum
   - seeds players by signup ELO
   - creates round 1
   - generates the single-elimination bracket
   - auto-advances BYE slots
   - spawns game 1 for each real match
4. Tournament moves to `ACTIVE`.

### 2.6 Match Play

1. Each live match starts with game 1.
2. Colors rotate by game number.
3. Players receive `tournamentMatchGameReady`.
4. Players enter the current game through the normal game experience.
5. When a tournament game ends by gameplay, resign, timeout, or agreed draw:
   - ladder ELO is not changed
   - match progression is recalculated
   - next game is spawned if needed
   - or the match is completed if a winner is decided

### 2.7 Knockout Resolution Rules

Phase 1 uses knockout logic:

- target is best-of-3
- two consecutive losses ends the match early
- draws reset the consecutive-loss pressure
- if wins are tied after 3 games, extra games continue until one player wins

### 2.8 Round Advancement

1. When all matches in a round are complete, the backend advances automatically.
2. Winners are collected in seed order.
3. Next round is created.
4. New matches are created.
5. First game is spawned for each live match.
6. Tournament room receives `tournamentRoundAdvanced`.

### 2.9 Tournament Completion

1. When only one winner remains, tournament status becomes `COMPLETED`.
2. Tournament room receives `tournamentCompleted`.
3. Public and admin pages refresh to show the final winner and completed bracket.

---

## 3. Admin Management Flow

### Before Start

Admin can:

- edit tournament details
- change schedule
- change registration deadline
- change scope
- change min/max players
- cancel tournament
- remove participants for policy reasons

### After Start

Admin can:

- monitor participants
- watch round progress
- inspect current round matches
- manually resolve stuck matches

Admin cannot:

- remove participants from the live bracket
- cancel the tournament through the current backend flow
- edit tournament setup after activation

---

## 4. Player-Facing Surfaces

### Community Tournament List

Purpose:

- discovery
- status visibility
- quick scan of active, open, and completed tournaments

### Tournament Detail Page

Purpose:

- registration and withdrawal
- eligibility review
- live tournament following
- access to current match game

### Game Page

Purpose:

- play the current tournament game using the same runtime as other PvP games

---

## 5. Real-Time Experience

WebSocket events support the product feel:

- `joinTournament`
- `tournamentMatchGameReady`
- `tournamentMatchCompleted`
- `tournamentRoundAdvanced`
- `tournamentCompleted`

Result:

- players see bracket progress without manual refresh
- players get directed to the correct current game
- admins can monitor active events in near real time

---

## 6. Known Product Gaps

- Public list currently fetches detail per tournament card, which will not scale well.
- UI messaging already references automatic scheduling, but no scheduler service exists yet.
- Public status handling can make a lapsed registration window look completed instead of stalled or awaiting admin action.
- Participant display on the public page is still seed-centric in places rather than identity-rich.
- Earlier docs described Round Robin as Phase 1, but the live product only supports Single Elimination.

---

## 7. Recommended Phase 1 Positioning

Use this wording when describing the shipped product:

> Phase 1 delivers admin-run single-elimination tournaments with registration, eligibility filters, live bracket progression, and manual moderation tools. Additional formats and scheduling automation follow in later phases.
