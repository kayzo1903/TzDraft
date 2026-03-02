# Phase 11: Online Quick Match (Matchmaking)

**Status:** 🟢 Implementation complete — migration applied
**Branch:** `feature/start-pvp-game`
**Last updated:** 2026-03-02

---

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

## Implementation Status

### Backend

| File | Status | Notes |
|------|--------|-------|
| `backend/prisma/schema/matchmaking.prisma` | ✅ Created | `MatchmakingQueue` model with Glicko-2 stubs |
| `backend/prisma/schema/user.prisma` | ✅ Updated | Added `matchmakingQueue` back-relation on `User` |
| `backend/prisma/schema/base.prisma` | ✅ Updated | Added `directUrl = env("DIRECT_URL")` for migration support |
| `backend/prisma/schema.prisma` | ✅ Merged | All schema files merged via `node scripts/merge-schemas.js` |
| `backend/prisma/migrations/20260302000000_add_matchmaking_queue/migration.sql` | ✅ Created | SQL ready — **not yet applied to DB** |
| `backend/scripts/merge-schemas.js` | ✅ Updated | Added `matchmaking.prisma` to merge list |
| `backend/src/domain/game/repositories/matchmaking.repository.interface.ts` | ✅ Created | `IMatchmakingRepository` with upsert / findOldestMatch / remove / removeStale |
| `backend/src/infrastructure/repositories/prisma-matchmaking.repository.ts` | ✅ Created | Full Prisma implementation |
| `backend/src/infrastructure/repositories/repository.module.ts` | ✅ Updated | Registered `IMatchmakingRepository` |
| `backend/src/application/use-cases/join-queue.use-case.ts` | ✅ Created | FIFO pairing + stale cleanup (3 min TTL) |
| `backend/src/application/use-cases/use-cases.module.ts` | ✅ Updated | Registered `JoinQueueUseCase` |
| `backend/src/interface/http/dtos/join-queue.dto.ts` | ✅ Created | Validates `timeMs` ∈ {180000, 300000, 600000, 1800000} |
| `backend/src/interface/http/controllers/game.controller.ts` | ✅ Updated | Added `POST /games/queue/join` + `POST /games/queue/cancel` |
| `backend/src/infrastructure/messaging/games.gateway.ts` | ✅ Updated | Added `emitMatchFound(socketId, gameId)` |
| Prisma client regenerated | ✅ Done | `npx prisma generate` succeeded |

### Frontend

| File | Status | Notes |
|------|--------|-------|
| `frontend/src/services/game.service.ts` | ✅ Updated | Added `joinQueue(timeMs, socketId)` + `cancelQueue()` |
| `frontend/src/hooks/useMatchmaking.ts` | ✅ Created | `idle → searching → matched` state machine; auto-cancel on unmount |
| `frontend/src/app/[locale]/game/setup-friend/page.tsx` | ✅ Updated | Added Quick Match tab + `QuickMatchTab` component |

### Database

| Task | Status | Notes |
|------|--------|-------|
| Migration SQL written | ✅ Done | `20260302000000_add_matchmaking_queue` |
| `DIRECT_URL` added to base.prisma | ✅ Done | Required for Supabase DDL via pooler |
| `DIRECT_URL` added to `.env` | ✅ Not needed | Pooler accepted DDL once DB was awake |
| `npx prisma migrate deploy` | ✅ Done | `20260302000000_add_matchmaking_queue` applied |

---

## Data Model

File: `backend/prisma/schema/matchmaking.prisma`

```prisma
model MatchmakingQueue {
  id         String   @id @default(uuid())
  userId     String   @unique          // one entry per user at most
  timeMs     Int                       // 180000 | 300000 | 600000 | 1800000
  socketId   String                    // used to emit matchFound directly
  joinedAt   DateTime @default(now())

  // Future ILO / Glicko-2 fields — nullable, ignored by matching logic now
  rating     Int?
  rd         Float?
  volatility Float?

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("matchmaking_queue")
}
```

---

## Backend Logic

### JoinQueueUseCase — FIFO pairing

1. Remove stale entries older than 3 minutes.
2. Remove any existing entry for the requesting user.
3. Look for the oldest waiting entry with the same `timeMs`.
4a. **Match found** → delete both entries → `createGame(ACTIVE, CASUAL)` → emit `matchFound` to both sockets → return `{ status: "matched", gameId }`.
4b. **No match** → insert entry → return `{ status: "waiting" }`.

### HTTP Endpoints

| Method | Path | Body | Response | Purpose |
|--------|------|------|----------|---------|
| `POST` | `/games/queue/join` | `{ timeMs, socketId }` | `{ status, gameId? }` | Enqueue player |
| `POST` | `/games/queue/cancel` | — | `204` | Remove self from queue |

### WebSocket Event

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `matchFound` | Server → Client | `{ gameId }` | Notify both matched players |

---

## Frontend

### Time Controls

| Label | Name | `timeMs` |
|-------|------|----------|
| 3 min | Bullet | 180000 |
| 5 min | Blitz | 300000 |
| 10 min | Rapid | 600000 |
| 30 min | Classic | 1800000 |

### useMatchmaking hook states

```
idle  →  (joinQueue)  →  searching  →  (matchFound WS)  →  matched  →  navigate
                               ↓
                          (cancelQueue)
                               ↓
                             idle
```

---

## End-to-End Flow

1. Player A opens Quick Match tab, selects Rapid (10 min).
2. Clicks "Find Opponent" → `POST /games/queue/join { timeMs: 600000, socketId }`.
3. No match → entry inserted, UI shows "Searching…".
4. Player B does the same.
5. `JoinQueueUseCase` finds Player A → deletes both → creates CASUAL ACTIVE game.
6. Gateway emits `matchFound { gameId }` to both socket IDs.
7. Both navigate to `/game/{gameId}` simultaneously.
8. Game is already `ACTIVE` — clocks start immediately, no host-start step.

---

## ILO Deferral Note (Policy Section 4.1)

| Phase | Matchmaking | Rating |
|-------|-------------|--------|
| **11 (now)** | FIFO within time-control bucket (3/5/10/30 min) | No ILO change — Casual (policy §3.1) |
| **Future** | ILO ±100→±300 expanding local-first | Glicko-2 rated games |

Schema already has nullable `rating`, `rd`, `volatility` — no breaking migration needed when upgrading.

---

## Next Steps

### 1. End-to-end test

Once the table exists:

- [ ] Open two browser tabs, both authenticated.
- [ ] Both join Quick Match with the same time control.
- [ ] Verify both tabs navigate to the same game simultaneously.
- [ ] Verify the game starts `ACTIVE` with clocks running.
- [ ] Verify cancelling removes the entry cleanly.
- [ ] Verify stale entries (wait 3+ min without a match) are cleaned up on next enqueue.

### 3. Future — ILO rating activation (Phase 12+)

When player base is large enough:
- Populate `rating` / `rd` / `volatility` in `MatchmakingQueue.upsert` from `user.rating`.
- Add ELO-band filter in `findOldestMatch` (e.g. `|rating_a - rating_b| < 200`).
- Expand band every 30 s of wait time.
- Switch matched games from `GameType.CASUAL` to `GameType.RANKED`.

---

## Phase 11 Acceptance Criteria

- [ ] Player can join queue with a selected time control (3 / 5 / 10 / 30 min).
- [ ] Second player joining the same time control triggers `matchFound` for both immediately.
- [ ] First player waits if queue is empty (searching state shown).
- [ ] Cancelling removes the player from the queue cleanly.
- [ ] Stale entries older than 3 minutes are auto-cleaned on next enqueue.
- [ ] Both matched players navigate to `/game/{id}` simultaneously via `matchFound` WS event.
- [ ] Matched game starts as `ACTIVE` immediately (no manual host-start step).
- [ ] `GameType = CASUAL` — no ILO changes applied (policy §3.1).
- [ ] `MatchmakingQueue` schema includes nullable `rating`, `rd`, `volatility` columns.
- [ ] Unmounting the Quick Match UI while searching auto-cancels the queue entry.
