# PvP Realtime Architecture (Server-Authoritative)

**Last updated:** 2026-02-19  
**Applies to:** Online PvP games (Ranked + Casual) using Socket.IO `namespace: games`

This document describes **how PvP works end-to-end**, and the **architecture decisions** behind it. It is written to match the current implementation (not a theoretical protocol).

---

## 1) Goals / Non-goals

### Goals
- **Fairness**: server is the only authority for legal moves, clocks, and results.
- **Realtime**: low-latency UX with recoverable state sync (reconnect/reload).
- **Auditability**: persist move history so the server can reconstruct state.
- **Operational simplicity** (MVP): single server instance, in-memory timers.

### Non-goals (for now)
- Horizontal scaling across multiple WS nodes with shared routing (Redis pub/sub).
- Anti-cheat hardening beyond “server validates everything”.
- Spectator mode / tournament broadcasting protocol.

---

## 2) High-level System Diagram

**Frontend**
- Online runtime page: `frontend/src/app/[locale]/game/[id]/page.tsx`
- UI move hints (non-authoritative): `frontend/src/lib/game/ui-legal-moves.ts`

**Backend**
- WebSocket gateway (Socket.IO): `backend/src/infrastructure/messaging/games.gateway.ts`
- Move execution: `backend/src/application/use-cases/make-move.use-case.ts`
- Game termination: `backend/src/application/use-cases/end-game.use-case.ts`
- Domain validation/rules:
  - `backend/src/domain/game/services/move-validation.service.ts`
  - `backend/src/domain/game/services/capture-finding.service.ts`
  - `backend/src/domain/game/services/game-rules.service.ts`
- Persistence (Prisma repos):
  - `backend/src/infrastructure/repositories/prisma-game.repository.ts`
  - `backend/src/infrastructure/repositories/prisma-move.repository.ts`

**Storage**
- Database stores `game`, `clock`, and `move` rows.
- Board state is treated as **derivable** from move history (rehydration).

---

## 3) Decision Record (Architecture Decisions)

### D1 — Server-authoritative state (always)
**Decision:** The server validates all moves and broadcasts the canonical board/clock state.  
**Why:** Prevents client tampering and resolves all rule disputes centrally.  
**Consequence:** Client-side “legal move” highlighting is best-effort UX only; it must never be trusted.

### D2 — Realtime transport via Socket.IO rooms keyed by `gameId`
**Decision:** A game is a Socket.IO room with id = `gameId`.  
**Why:** Simple fan-out of updates to all participants.  
**Consequence:** Event naming and payloads must remain stable because the frontend listens directly.

### D3 — Persist moves; reconstruct board by replay (rehydration)
**Decision:** The DB persists move history; server reconstructs board by replaying moves on load.  
**Why:** Enables reload/reconnect recovery and future auditing.  
**Consequence:** Any rule change must consider replay determinism (old games must still replay correctly).

### D4 — Client may be optimistic, but rollback is mandatory on rejection
**Decision:** The client can apply an optimistic board update for responsiveness.  
**Why:** Smooth UX on high latency networks.  
**Consequence:** Client must listen for `moveRejected` and revert to the last known good snapshot.

### D5 — Forced capture and multi-capture are enforced server-side
**Decision:** “If capture exists, you must capture” is enforced on the server. Multi-jump capture validation is server-authoritative.  
**Why:** Rules correctness and fairness.  
**Consequence:** Client must either send enough data (e.g., capture path) or accept server-selected capture variants when ambiguous.

### D6 — Clock is server-owned; clients display projections
**Decision:** Server stores clock state; client displays projected clock using `serverTimeMs` snapshots.  
**Why:** Prevents client-side clock cheating and reduces desync.  
**Consequence:** Timeouts must be enforced server-side (timers +/or pre-move fail-fast).

### D7 — Timeouts and disconnect forfeits use in-memory timers (MVP)
**Decision:** Gateway schedules timers in memory for game timeout and disconnect grace.  
**Why:** Fast MVP without adding Redis/queue.  
**Consequence:** Timers do not survive server restarts; must be revisited for production HA.

### D8 — Draw offers are managed by the gateway with TTL
**Decision:** Draw offer state lives in-memory with an expiry timer; accept triggers server-side game end.  
**Why:** Lightweight realtime draw handshake.  
**Consequence:** Draw offers will be lost on server restart; clients must tolerate that.

### D9 — “Engine parity” is a UX concern; rules are a backend concern
**Decision:** Frontend uses an engine to compute legal moves for UX, but backend remains the source of truth.  
**Why:** Responsiveness and better UX without trusting client logic.  
**Consequence:** If the engines diverge, the UI can show moves the server rejects; mitigation is improving parity, not trusting the client.

---

## 4) Realtime Protocol (Current Socket.IO Events)

This section documents **the event contracts actually used**.

### 4.1 Client → Server

- `findMatch`
  - payload: `{ mode: 'RANKED' | 'CASUAL', guestName?: string }`
  - response (ack): `{ status: 'success' | 'error', message?: string }`

- `cancelMatch`
  - payload: (none)
  - response (ack): `{ status: 'success' | 'error', message?: string }`

- `joinGame`
  - payload: `string` (gameId) or `{ gameId?: string }`
  - response (ack): `{ status: 'success' | 'error', message?: string }`

- `makeMove`
  - payload: `{ gameId: string, from: number, to: number }`
  - response (ack): `{ status: 'success' | 'error', message?: string }`
  - notes:
    - server emits `moveRejected` on failure with a user-facing message.
    - multi-capture `path` is supported by HTTP DTOs but is not currently sent in the WS payload.

- `requestDraw`
  - payload: `{ gameId: string }`
  - response (ack): `{ status: 'success' | 'error', message?: string }`

- `respondDraw`
  - payload: `{ gameId: string, accept: boolean }`
  - response (ack): `{ status: 'success' | 'error', message?: string }`

- `cancelDraw`
  - payload: `{ gameId: string }`
  - response (ack): `{ status: 'success' | 'error', message?: string }`

### 4.2 Server → Client

- `joinedGame`
  - payload: `{ gameId: string, playerColor: 'WHITE' | 'BLACK' }`
  - purpose: informs the client which perspective to render after refresh/reconnect.

- `gameStateUpdated`
  - payload: a full snapshot containing:
    - `status`, `winner`, `endReason`, `currentTurn`
    - `clockInfo` (plus `serverTimeMs`)
    - `board` (canonical server board record)
    - `lastMove` (from/to/captures/notation/etc)

- `moveRejected`
  - payload: `{ gameId, from, to, message }`
  - purpose: rollback optimistic UI and show a user-facing reason.

- `gameOver`
  - payload: `{ winner, reason, endedBy?, noMoves? }`
  - emitted from `EndGameUseCase` flows (resign/timeout/draw/abort/disconnect).

- Draw lifecycle events:
  - `drawOffered`: `{ gameId, offeredBy, expiresAt }`
  - `drawDeclined`: `{ gameId, declinedBy }`
  - `drawCancelled`: `{ gameId, cancelledBy }`
  - `drawOfferExpired`: `{ gameId }`

- Disconnect lifecycle events:
  - `playerDisconnected`: `{ playerId, timeoutSec }`
  - `playerReconnected`: `{ playerId }`

---

## 5) Authoritative Move Pipeline (Step-by-step)

### 5.1 Client-side (UX)
1. Client renders last server board snapshot.
2. Client computes “legal move highlights” locally for UX.
3. On drop:
   - optionally applies **optimistic UI** update (visual only)
   - locks further interaction until server confirms (prevents double-move attempts)
   - emits `makeMove` `{ gameId, from, to }`

### 5.2 Server-side (authoritative)
1. Gateway receives `makeMove` and delegates to `MakeMoveUseCase`.
2. Use-case loads `Game` from repository (board is reconstructed by replaying moves).
3. Server validates with `MoveValidationService`:
   - correct game state + turn
   - piece ownership
   - forced capture enforcement
   - capture-path validation (single or multi-jump)
   - king movement rules (flying king simple moves, capture rules)
4. If invalid:
   - gateway emits `moveRejected` with message
   - client rolls back to last snapshot
5. If valid:
   - server updates clocks
   - applies move to domain game state
   - persists `game`, `clock`, `move` in a transaction
   - broadcasts `gameStateUpdated` to the room
   - schedules the next player’s timeout

---

## 6) Clock + Timeout Enforcement

- Server stores `clockInfo` and includes `serverTimeMs` in each `gameStateUpdated`.
- Gateway schedules a timeout for the next player with a small latency buffer.
- Current state: timeout enforcement is primarily timer-driven; strict “fail-fast before move” enforcement is a closure item.

---

## 7) Disconnect Handling

- On WS disconnect, gateway schedules a per-user disconnect-forfeit timer for all active games for that user.
- On reconnect/join, server cancels pending disconnect forfeits and emits `playerReconnected`.
- If the user does not return before grace expires:
  - if no moves were made, game may end as draw (no rating change)
  - otherwise disconnected user loses by disconnect forfeit

---

## 8) Draw Offers

- Draw offers are stored in gateway memory per `gameId` with TTL.
- If the opponent accepts, server ends the game immediately by draw agreement.
- Expiry/decline/cancel are broadcast to both clients so the UI stays consistent.

---

## 9) Known Gaps / Follow-ups

- Consider extending WS `makeMove` payload to include `path?: number[]` for multi-capture disambiguation.
- Re-enable rule-based “no legal moves / no pieces” game-over detection in `MakeMoveUseCase` once fully validated.
- Replace in-memory timers with a durable scheduler (Redis/queue) for production reliability.
- Unify socket initialization across matchmaking + in-game pages to reduce reconnection drift.
