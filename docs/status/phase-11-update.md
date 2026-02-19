# Phase 11 Status Update: Real-time Online Gameplay & Engine Integration

**Date:** 2026-02-19
**Status:** In progress (core loop stable, closure items remaining)

## 1. Scope

Phase 11 focuses on online game correctness and real-time reliability:

- Server-authoritative move flow (validate, persist, broadcast canonical state).
- Client sync flow (render server board, recover on reconnect, prevent illegal interactions).
- Integration parity (1-32 engine/server coordinates vs 8x8 UI, clock/timing consistency).
- PvP architecture decisions + realtime protocol: `docs/architecture/pvp-realtime-architecture.md`

## 2. Current Implementation Snapshot

### 2.1 Backend (authoritative path)

- WebSocket gateway is active and feature-complete for core play flow:
  - `joinGame`, `makeMove`, `findMatch`, `cancelMatch`, `requestDraw`, `respondDraw`, `cancelDraw`
  - disconnect grace forfeit timers and per-game timeout scheduling
  - file: `backend/src/infrastructure/messaging/games.gateway.ts`
- `makeMove` executes validation + persistence + broadcast:
  - validates via `MoveValidationService`
  - applies move, updates clock, writes `game`, `clock`, and `move` in a transaction
  - emits `gameStateUpdated` with `serverTimeMs`
  - file: `backend/src/application/use-cases/make-move.use-case.ts`
- Refresh/reload board reconstruction is implemented:
  - repository replays persisted moves through `rehydrateMoves`
  - file: `backend/src/infrastructure/repositories/prisma-game.repository.ts`

### 2.2 Frontend (online runtime)

- Online game page uses a local socket lifecycle for stability:
  - joins room, listens for `gameStateUpdated`, `moveRejected`, `gameOver`, draw events, disconnect/reconnect events
  - consumes `joinedGame` for server-confirmed player perspective
  - file: `frontend/src/app/[locale]/game/[id]/page.tsx`
- UI-side legal move filtering uses shared engine adapters:
  - coordinate conversion helpers: `frontend/src/lib/game/board-coords.ts`
  - legal moves: `frontend/src/lib/game/ui-legal-moves.ts`

## 3. Completed in Phase 11

- Server-authoritative broadcast loop is working end-to-end.
- Draw offer lifecycle is implemented and integrated in both gateway and game page.
- Disconnect grace + reconnect cancellation path is implemented.
- Board hydration after reload is implemented via move replay.
- Client clock rendering uses server snapshot + `serverTimeMs` latency adjustment.
- Illegal move rejection path is surfaced to user through `moveRejected`.
- Fixed backend multi-capture detection/validation so PvP online accepts multi-jump captures (origin preserved through capture recursion).
- Fixed backend king movement validation to allow flying-king simple moves (prevents false “Piece cannot move from X to Y” after promotion).
- Improved online result modal to always show Win/Loss/Draw and a clear end condition (resign/time/disconnect/draw/rule end), with actions: Rematch / New Match / Home.

## 4. Remaining to Close Phase 11

### 4.1 Re-enable rule-based game-over in move pipeline

- `make-move.use-case.ts` still has game-over evaluation disabled behind comments.
- This should now be re-enabled and validated since board rehydration exists.

### 4.2 Tighten strict timeout enforcement

- Timeout scheduling exists in gateway, but the elapsed-time-overrun branch in `make-move.use-case.ts` does not immediately terminate the game yet.
- Result: timeout correctness depends on scheduled timer path, not strict pre-move enforcement.

### 4.3 Socket client unification

- Matchmaking page uses `useSocket`, but game runtime uses local socket initialization.
- Keep one consistent socket/auth strategy to reduce drift and subtle reconnect bugs.

## 5. Phase 11 File Map (Current)

```text
backend/src/infrastructure/messaging/games.gateway.ts
backend/src/application/use-cases/make-move.use-case.ts
backend/src/infrastructure/repositories/prisma-game.repository.ts
backend/src/interface/http/controllers/game.controller.ts
backend/src/interface/http/controllers/system.controller.ts

frontend/src/app/[locale]/game/online/page.tsx
frontend/src/app/[locale]/game/[id]/page.tsx
frontend/src/lib/game/board-coords.ts
frontend/src/lib/game/ui-legal-moves.ts
frontend/src/components/game/Board.tsx
frontend/src/services/game.service.ts
```

## 6. Immediate Execution Plan

1. Re-enable and test `GameRulesService` game-over checks in `make-move.use-case.ts`.
2. Add strict timeout handling in pre-move validation path (server-side authoritative fail-fast).
3. Unify socket initialization between `useSocket` and game page runtime.
4. Run backend e2e flow for move, timeout, draw, reconnect paths and update this status as complete.
