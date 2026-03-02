# Phase 11: Online Quick Match (Matchmaking)

## Goal

Deliver a **Quick Match** experience where any player can join a queue and be automatically paired with another waiting player — no invite code, no manual coordination.

Policy compliance: implements **Section 4.2** (time control buckets) immediately. **Section 4.1** (ILO-banded local-first) deferred until user base is large enough to sustain per-region queues.

---

## Scope

1. Backend matchmaking queue (FIFO, time-control bucketed).
2. Backend `JoinQueueUseCase` (pairing logic).
3. WebSocket event `matchFound` to notify both matched players.
4. Frontend `useMatchmaking.ts` hook.
5. New "Quick Match" tab on the game setup page.
6. Schema pre-stubs `rating`, `rd`, `volatility` as nullable (future ILO / Glicko-2 ready).

---

## Data Model

File: `backend/prisma/schema/matchmaking.prisma`

```prisma
model MatchmakingQueue {
  id         String   @id @default(uuid())
  userId     String   @unique          // one entry per user at most
  timeMs     Int                       // 300000 | 600000 | 900000
  socketId   String                    // used to emit matchFound directly
  joinedAt   DateTime @default(now())

  // Future ILO / Glicko-2 fields — nullable, ignored by matching logic now
  rating     Int?
  rd         Float?
  volatility Float?

  user       User     @relation(fields: [userId], references: [id])

  @@map("matchmaking_queue")
}
```

---

## Backend Implementation

### 1. Join Queue Use Case

File: `backend/src/application/use-cases/join-queue.use-case.ts`

Pairing logic (FIFO, time-control bucketed):

1. Remove any existing queue entry for the requesting user (one entry per user max).
2. Auto-delete stale entries older than 3 minutes.
3. Look for the oldest waiting entry with the same `timeMs`.
4a. **Match found** → delete both entries → `createPvPGame()` → emit `matchFound` to both `socketId`s → return `{ status: "matched", gameId }`.
4b. **No match** → insert new entry → return `{ status: "waiting" }`.

### 2. HTTP Controller

File: `backend/src/interface/http/controllers/game.controller.ts`

New endpoints:

| Method | Path | Body | Response | Purpose |
|--------|------|------|----------|---------|
| `POST` | `/games/queue/join` | `{ timeMs }` | `{ status, gameId? }` | Enqueue player |
| `POST` | `/games/queue/cancel` | — | `204` | Remove self from queue |

### 3. WebSocket Gateway

File: `backend/src/infrastructure/messaging/games.gateway.ts`

New server-emitted event:

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `matchFound` | Server → Client | `{ gameId }` | Notify both matched players to navigate to the game |

Emitted directly to each player's `socketId` (not a room broadcast) so only the two matched players receive it.

### 4. DTO

File: `backend/src/interface/http/dtos/join-queue.dto.ts`

```typescript
export class JoinQueueDto {
  @IsIn([300000, 600000, 900000])
  timeMs: number;
}
```

---

## Frontend Implementation

### 1. Matchmaking Hook

File: `frontend/src/hooks/useMatchmaking.ts`

State:

```typescript
type MatchmakingState = 'idle' | 'searching' | 'matched';
```

Behavior:

1. `joinQueue(timeMs)` → `POST /games/queue/join` → sets state to `searching`.
2. Listens for WS `matchFound` event → sets state to `matched` → navigates to `/game/{gameId}`.
3. `cancelQueue()` → `POST /games/queue/cancel` → sets state to `idle`.
4. On component unmount: auto-cancel if still `searching`.

### 2. Game Service

File: `frontend/src/services/game.service.ts`

New methods:

1. `joinQueue(timeMs)` → `POST /games/queue/join`
2. `cancelQueue()` → `POST /games/queue/cancel`

### 3. Setup Page — Quick Match Tab

File: `frontend/src/app/[locale]/game/setup-friend/page.tsx`

New "Quick Match" tab alongside Local and Online (Invite):

```
[ Local ]  [ Online - Invite ]  [ Quick Match ]

   Time control:
   ┌─────────┐  ┌──────────┐  ┌───────────┐
   │  Blitz  │  │  Rapid   │  │  Classic  │
   │  5 min  │  │  10 min  │  │  15 min   │
   └─────────┘  └──────────┘  └───────────┘

        [ Find Opponent ]

   --- while searching ---
   Searching for opponent...  ●●●
              [ Cancel ]
```

---

## End-to-End Flow

1. Player A opens the Quick Match tab and selects Rapid (10 min).
2. Player A clicks "Find Opponent" → `POST /games/queue/join { timeMs: 600000 }`.
3. No match found → entry inserted, UI shows "Searching...".
4. Player B opens Quick Match, selects Rapid, clicks "Find Opponent".
5. `JoinQueueUseCase` finds Player A's entry → deletes both → creates CASUAL PvP game.
6. Backend emits `matchFound { gameId }` directly to both players' sockets.
7. Both clients navigate to `/game/{gameId}` simultaneously.
8. Game is already `ACTIVE` (no host-start step needed — both slots filled at creation).
9. Board renders interactively, clocks start running.

---

## ILO Deferral Note (Policy Section 4.1)

The full local-first ILO-banded matchmaking described in the official policy (Section 4.1) will activate in a future phase when:

- Enough concurrent users exist to sustain per-region queues without excessive wait times.
- Glicko-2 `rating` / `rd` / `volatility` fields have been populated from actual game history.

The `MatchmakingQueue` schema is already prepared with these nullable fields — enabling the upgrade requires no breaking migrations, only activating the filtering logic.

| Phase | Matchmaking strategy | Rating |
|-------|----------------------|--------|
| **11 (now)** | FIFO within time-control bucket | No ILO change (Casual, policy §3.1) |
| **Future** | ILO ±100→±300 expanding local-first | Glicko-2 rated games |

---

## Phase 11 Acceptance Criteria

- [ ] Player can join queue with a selected time control.
- [ ] Second player joining the same time control triggers `matchFound` for both immediately.
- [ ] First player waits if queue is empty (searching state shown).
- [ ] Cancelling removes the player from the queue cleanly.
- [ ] Stale entries older than 3 minutes are auto-cleaned on next enqueue.
- [ ] Both matched players navigate to `/game/{id}` simultaneously via `matchFound` WS event.
- [ ] Matched game starts as `ACTIVE` immediately (no manual host-start step).
- [ ] `GameType = CASUAL` — no ILO changes applied (policy §3.1).
- [ ] `MatchmakingQueue` schema includes nullable `rating`, `rd`, `volatility` columns.
- [ ] Unmounting the Quick Match UI while searching auto-cancels the queue entry.
