# Phase 11: Online Quick Match (Matchmaking)

**Status:** ✅ Complete — migration applied, stale-socket bug fixed
**Branch:** `feature/start-pvp-game` → merged
**Last updated:** 2026-03-03

---

## Goal

Deliver a **Quick Match** experience where any authenticated player can join a queue and be automatically paired with another waiting player — no invite code, no manual coordination.

Policy compliance: implements **Section 4.2** (time-control buckets) immediately. **Section 4.1** (ILO-banded local-first) deferred until the user base is large enough to sustain per-region queues.

---

## What We Achieved

Phase 11 completed the **full online PvP layer** for TzDraft. Two distinct PvP modes are now live:

| Mode | Entry Point | Matching | Auth Required |
|---|---|---|---|
| **Quick Match** | `setup-online` page | Automatic FIFO by time control | Yes |
| **Play with Friend** | `setup-friend` page | Invite code (6-char) | Creator yes; guest optional |

Both modes share the same game engine, real-time WebSocket layer, clock system, and game lifecycle (resign / draw / abort / timeout).

---

## PvP Technical Architecture

### Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  useMatchmaking.ts      useOnlineGame.ts      useSocket.ts      │
│       ↕ HTTP                ↕ HTTP                ↕ WS          │
├─────────────────────────────────────────────────────────────────┤
│                        BACKEND (NestJS)                         │
│  GameController          GamesGateway          ClockService     │
│  JoinQueueUseCase        MakeMoveUseCase        EndGameUseCase  │
│       ↕                       ↕                                 │
│  PrismaGameRepo      PrismaMatchmakingRepo                      │
│       ↕                       ↕                                 │
├─────────────────────────────────────────────────────────────────┤
│              Supabase PostgreSQL  ·  Socket.IO /games           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

**HTTP for moves, WebSocket for events.**
Move submission (`POST /games/:id/moves`) goes over HTTP so it is reliable, authenticated, and trivially retried. The WebSocket layer is used only for push events (`gameStateUpdated`, `matchFound`, `gameOver`, `abandonCountdown`) — never for state mutations. This prevents the dual-write race conditions common in pure-WS designs.

**Server-authoritative game state.**
All rules, clocks, and draw conditions are enforced on the server. The frontend is a view — it renders what the server tells it. No client move is trusted until the server validates and stores it.

**Namespace isolation.**
All game WebSocket traffic uses the `/games` namespace. This prevents cross-contamination with other socket channels and lets Socket.IO apply the JWT guard selectively.

**userId-indexed socket map.**
The gateway maintains an in-memory `userSocketMap: Map<userId, socketId>` that is updated on every connection. Events sent to a user (like `matchFound`) are routed via this map — never via a stale socket ID stored in the database. This eliminates the one-sided match bug (see Bug Fix section below).

---

## Complete End-to-End PvP Flow

### Path A — Quick Match

```
PLAYER A                           SERVER                          PLAYER B
───────────────────────────────────────────────────────────────────────────

1. Open Quick Match tab
   Select "Rapid (10 min)"
   Click "Find Opponent"
   ──── POST /games/queue/join ──────►
   { timeMs: 600000, socketId: "A1" }
                                   2. JoinQueueUseCase:
                                      removeStale(1 min TTL)
                                      remove(userId_A)
                                      findOldestMatch(600000) → null
                                      upsert({ userId_A, timeMs, socketId })
   ◄── { status: "waiting" } ────────
3. setState("searching")
   UI: pulsing search animation
   60s auto-cancel timeout starts

                                                    4. Open Quick Match tab
                                                       Select "Rapid (10 min)"
                                                       Click "Find Opponent"
                                               ──── POST /games/queue/join ────►
                                               { timeMs: 600000, socketId: "B1" }
                                   5. JoinQueueUseCase:
                                      removeStale()
                                      remove(userId_B)
                                      findOldestMatch(600000) → Player A row
                                      remove(userId_A from queue)
                                      new Game(uuid, whiteId, blackId,
                                               CASUAL, timeMs=600000)
                                      game.start() → status = ACTIVE
                                      gameRepo.create(game)
                                      return {
                                        status: "matched",
                                        gameId: "g-uuid",
                                        opponentUserId: userId_A   ← userId, not socketId
                                      }
                                   6. Notify Player A:
                                      currentSocketId = userSocketMap.get(userId_A)
                                      server.to(currentSocketId)
                                             .emit("matchFound", { gameId })
                                               ──► { status:"matched", gameId } ─►
7. socket.on("matchFound")                                         8. HTTP response arrives
   clearTimeout(search timer)                                         res.data.status === "matched"
   setState("matched")                                                setState("matched")
   router.push(/game/g-uuid)                                          router.push(/game/g-uuid)

9. BOTH PLAYERS LAND ON /game/g-uuid
   ────────────────────────────────────────────────────────────────
   useOnlineGame.ts mounts:
   - GET /games/g-uuid  → fetches full game state
   - socket.emit("joinGame", { gameId }) → joins WS room "g-uuid"
   - Clocks are already running server-side (game was started at step 5)
   ────────────────────────────────────────────────────────────────
```

**Color assignment:** random 50/50 via `Math.random() < 0.5` in `JoinQueueUseCase`. Neither player has an advantage from joining first or second.

---

### Path B — Play with Friend

```
CREATOR (White)                    SERVER                          JOINER (Black)
───────────────────────────────────────────────────────────────────────────

1. Open "Play with Friend" tab
   Click "Create Invite"
   ──── POST /games/invite ──────────►
                                   2. CreateGameUseCase.createInviteGame():
                                      new Game(uuid, creatorId, null,
                                               CASUAL, null, WAITING)
                                      inviteCode = randomAlphanumeric(6)
                                      gameRepo.create(game)
   ◄── { gameId, inviteCode:"XK9P2M" }
3. Display share link / code
   UI shows "Waiting for opponent…"
   socket.emit("joinGame", { gameId })
   → joins WS room "game-uuid"

                                                    4. Receives code "XK9P2M"
                                                       ──── POST /games/invite/XK9P2M/join ────►
                                   5. CreateGameUseCase.joinInviteGame():
                                      findByInviteCode("XK9P2M") → game
                                      game.blackPlayerId = joinerId
                                      game.status = WAITING (still)
                                      gameRepo.update(game)
                                      emit("gameStateUpdated") to room
                                               ◄── { gameId } ──────────────────
                                   6. socket.emit("joinGame", { gameId })
                                      → joins WS room "game-uuid"

7. Receives "gameStateUpdated"
   Both players shown in lobby
   Creator sees "Start Game" button
   Click "Start Game"
   ──── POST /games/g-uuid/start ────►
                                   8. CreateGameUseCase / use-case:
                                      game.start() → status = ACTIVE
                                      Clocks begin
                                      emit("gameStateUpdated") to room
   ◄── gameStateUpdated ─────────────────────────────────────────►

9. BOTH PLAYERS IN ACTIVE GAME
```

---

### In-Game Flow (Both Modes)

Once both players are on `/game/{id}`, the move loop is identical regardless of how the game was created:

```
PLAYER (on-turn)                   SERVER                          OPPONENT

1. Selects piece → valid moves highlighted (CAKE engine, client-side)
2. Clicks destination
   ──── POST /games/:id/moves ──────►
   { from: 22, to: 18 }
                                   3. MakeMoveUseCase:
                                      validate move (server-side CAKE/domain)
                                      apply move to board state
                                      update clock (deduct time, switch turn)
                                      check draw / win conditions
                                      gameRepo.save(newState)
                                      emit("gameStateUpdated", fullState) to room
   ◄── gameStateUpdated ─────────────────────────────────────────►
4. Both UIs re-render from server state
   Clocks tick client-side between server updates

```

**Game-ending events** (all server-initiated, emitted to room):
- `gameOver` — checkmate / no-moves / time flag claimed / resignation / draw accepted
- `abandonCountdown { secondsLeft }` — ticks every 1 s when a player disconnects
- `gameStateUpdated` — after every move, draw offer, or abort

---

## The Stale Socket Bug — What Was Wrong and How It Was Fixed

### The Problem

When Player A joined the queue, their current `socket.id` was saved to the `matchmaking_queue` table:

```
matchmaking_queue row:
  userId:   "user-A"
  socketId: "Fx3k..."   ← snapshot at queue join time
  timeMs:   600000
```

Socket.IO generates a **new random ID on every reconnect**. Any of these can trigger a reconnect silently:
- Brief network hiccup
- Mobile radio switch (WiFi → 4G)
- Browser tab going to background then resuming
- Any heartbeat timeout

When Player B joined and matched Player A, the controller called:

```typescript
this.gamesGateway.emitMatchFound(result.opponentSocketId, result.gameId);
//                                            ↑ stale, may be dead
```

`server.to("Fx3k...").emit(...)` emits to nobody if that socket is gone. Player B got redirected via HTTP response. Player A never received the WebSocket event and stayed stuck on the search screen until the 60-second timeout.

### The Fix

**GamesGateway** now owns an in-memory `userSocketMap`:

```typescript
private userSocketMap = new Map<string, string>(); // userId → current socketId
```

It is updated on **every** connection (not just the first):

```typescript
handleConnection(client: Socket) {
  // ... JWT verify ...
  this.userSocketMap.set(payload.sub, client.id);  // always overwrites with latest
}

handleDisconnect(client: Socket) {
  if (remainingConnections === 0) {
    this.userSocketMap.delete(userId);             // only removed when fully offline
  }
}
```

`emitMatchFound` now accepts `userId` and resolves the live socket itself:

```typescript
emitMatchFound(userId: string, gameId: string) {
  const socketId = this.userSocketMap.get(userId);
  if (!socketId) {
    this.logger.warn(`emitMatchFound: no live socket for user ${userId}`);
    return;
  }
  this.server.to(socketId).emit('matchFound', { gameId });
}
```

`JoinQueueUseCase` returns `opponentUserId` instead of `opponentSocketId`, and the controller passes it through. The DB-stored `socketId` column is now unused for notification (it remains in schema for potential future analytics).

**Result:** Player A can reconnect any number of times while searching — they will always receive `matchFound` on their current socket.

---

## Files Changed

### Backend

| File | Change |
|---|---|
| `backend/prisma/schema/matchmaking.prisma` | `MatchmakingQueue` model — Glicko-2 stub columns |
| `backend/src/domain/game/repositories/matchmaking.repository.interface.ts` | `IMatchmakingRepository` interface |
| `backend/src/infrastructure/repositories/prisma-matchmaking.repository.ts` | Full Prisma implementation |
| `backend/src/application/use-cases/join-queue.use-case.ts` | FIFO pairing; returns `opponentUserId` |
| `backend/src/interface/http/controllers/game.controller.ts` | `POST /queue/join`, `POST /queue/cancel`; passes `opponentUserId` |
| `backend/src/infrastructure/messaging/games.gateway.ts` | `userSocketMap`; `emitMatchFound(userId, gameId)` |
| `backend/prisma/migrations/20260302000000_add_matchmaking_queue/migration.sql` | Migration applied ✅ |

### Frontend

| File | Change |
|---|---|
| `frontend/src/services/game.service.ts` | `joinQueue(timeMs, socketId)`, `cancelQueue()` |
| `frontend/src/hooks/useMatchmaking.ts` | `idle → searching → matched` state machine |
| `frontend/src/app/[locale]/game/setup-online/page.tsx` | Quick Match UI (time control selector, search spinner, cancel); sign-in gate links to `/auth/signin` |

---

## Data Model

```prisma
model MatchmakingQueue {
  id         String   @id @default(uuid())
  userId     String   @unique          // one entry per user at most
  timeMs     Int                       // 180000 | 300000 | 600000 | 1800000
  socketId   String                    // stored but notification now uses userSocketMap
  joinedAt   DateTime @default(now())

  // Future ILO / Glicko-2 — nullable, ignored by matching logic now
  rating     Int?
  rd         Float?
  volatility Float?

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("matchmaking_queue")
}
```

---

## Time Controls

| Label | Name | `timeMs` |
|---|---|---|
| 3 min | Bullet | 180 000 |
| 5 min | Blitz | 300 000 |
| 10 min | Rapid | 600 000 |
| 30 min | Classic | 1 800 000 |

---

## useMatchmaking State Machine

```
idle
 │
 ├─(joinQueue called)──────────────────────────────────────────────►
 │                                                             searching
 │                                                                  │
 │                           (HTTP res: status="matched") ◄─────────┤
 │                           (WS event: matchFound)       ◄─────────┤
 │                                                                  │
 │                                                             matched
 │                                                                  │
 │                                                    router.push(/game/:id)
 │
 └─(cancelQueue) ──────────────────────────────────── idle
                                                       │
 └─(60s timeout, no match) ───────────────────────── idle + error
                                                       │
 └─(component unmounts while searching) ────────── cancelQueue() + idle
```

---

## ILO Deferral Note (Policy §4.1)

| Phase | Matchmaking | Rating effect |
|---|---|---|
| **11 (live)** | FIFO within time-control bucket | None — `GameType.CASUAL` |
| **Future** | ILO ±100 → ±300 expanding bands, local-first | Glicko-2 rated; `GameType.RANKED` |

Schema already has nullable `rating`, `rd`, `volatility` — no migration needed when upgrading.

---

## Acceptance Criteria

- [x] Authenticated player can join queue with a selected time control (3 / 5 / 10 / 30 min)
- [x] Second player joining the same time control triggers `matchFound` for both
- [x] First player waits in "Searching…" state if queue is empty
- [x] Cancelling removes the player from the queue; UI returns to idle
- [x] Stale entries older than 1 minute are auto-cleaned on next enqueue
- [x] Both matched players navigate to `/game/{id}` simultaneously
- [x] Matched game starts as `ACTIVE` immediately — no host-start step
- [x] `GameType = CASUAL` — no ILO changes (policy §3.1)
- [x] Schema includes nullable `rating`, `rd`, `volatility`
- [x] Unmounting the Quick Match UI while searching auto-cancels the queue entry
- [x] Unauthenticated users see a sign-in prompt that links to `/auth/signin`
- [x] `matchFound` delivered reliably even if Player A's socket reconnected after joining queue
