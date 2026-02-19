# Phase 11 Status Update: Real-time Online Gameplay & Engine Integration

**Date:** 2026-02-19  

## 1. Scope / What We Are Doing Now

Phase 11 is about making **online games feel real-time and reliable** end-to-end:

- **Authoritative server gameplay loop**: accept a move, validate it, persist it, and broadcast a single canonical game state to both players.
- **Client UX loop**: render server state, compute legal moves locally, prevent illegal interactions, and keep socket + clock stable through refresh/reconnect.
- **Integration hardening**: align coordinate systems (1-32 vs 8x8 UI), align move semantics (captures/multi-captures/promotion), and align timing (server clock vs client clock).

Right now we are primarily focused on **stabilizing the integration boundaries** (WebSocket event contracts + board serialization + rule parity), and finishing the remaining correctness work (game-over detection + clock enforcement edge cases).

## 2. Current System Data Flow (Engineering Detail)

### 2.1 Realtime move pipeline (server-authoritative)

```text
Client (GamePage)
  |
  | WS: 'makeMove' { gameId, from, to }   // from/to are server positions (1-32)
  v
GamesGateway (Socket.IO namespace: /games)
  |
  v
MakeMoveUseCase.execute(gameId, playerId, from, to)
  |
  | MoveValidationService.validateMove(game, playerColor, fromPos, toPos, pathPos?)
  v
Game.applyMove(move) + persist:
  - PrismaGameRepository.update(game)
  - PrismaMoveRepository.create(move)
  |
  v
GamesGateway.emitGameStateUpdate(gameId, payload)
  |
  v
Clients receive 'gameStateUpdated' and rerender from canonical state
```

Key implementation points:

- **WebSocket entrypoint**: `backend/src/infrastructure/messaging/games.gateway.ts`
  - Handles `joinGame`, `makeMove`, matchmaking (`findMatch` / `cancelMatch`), draw offers (`requestDraw` / `respondDraw` / `cancelDraw`), and timers (disconnect grace + per-turn timeout).
  - Uses `WsOptionalJwtGuard` so guests can connect (ranked is still guarded at the feature level).
- **Move execution + persistence**: `backend/src/application/use-cases/make-move.use-case.ts`
  - Loads the `Game`, derives the player's color, validates via domain services, applies the move, persists game + move, then emits `gameStateUpdated`.
  - Corrects `moveNumber` using `IMoveRepository.countByGameId()` to avoid ordering/race issues.
- **Board hydration (refresh/reconnect correctness)**: `backend/src/infrastructure/repositories/prisma-game.repository.ts`
  - Rebuilds `Game.board` by replaying persisted moves via `Game.rehydrateMoves(moves)` so the board is not "empty" after a reload.

### 2.2 Client-side rendering + validation loop

The online game page (`frontend/src/app/[locale]/game/[id]/page.tsx`) is responsible for:

- Initial HTTP pull (`GET /games/:id`) to get game + board snapshot for first paint.
- Socket lifecycle management (connect -> join room -> listen for updates -> cleanup).
- Mapping backend state to UI state and computing legal moves for interactivity.

Client validation uses `@tzdraft/cake-engine` through:

- Legal move generation: `frontend/src/lib/game/ui-legal-moves.ts` (`CakeEngine.generateLegalMoves(...)`)
- Coordinate translation helpers: `frontend/src/lib/game/board-coords.ts`
  - `serverPosToUiPos` / `uiPosToServerPos` (mirrors 1-32 positions to match our UI perspective rules)
  - `positionToBoardIndex` / `boardIndexToPosition` (1-32 <-> 0-63 conversion using `Position` from the engine)
  - `displayIndexToBoardIndex` / `boardIndexToDisplayIndex` (handles board flipping for BLACK)

UI enforcement points:

- `frontend/src/components/game/Board.tsx` uses `legalMoves` + `forcedPieces` to:
  - prevent selecting pieces with no legal moves,
  - enforce mandatory capture (forced pieces),
  - prevent illegal destination clicks (shake feedback).

### 2.3 Clock + time sync

- Server clock snapshot: `backend/src/interface/http/controllers/game.controller.ts` (`GET /games/:id/clock`)
  - Returns `serverTimeMs` alongside effective `clockInfo` and `currentTurn`.
- Client time sync: `frontend/src/lib/server-time.ts`
  - Calls `GET /system/time` and caches offset for 60s to drive consistent UI countdowns.
- WebSocket timeout enforcement: `backend/src/infrastructure/messaging/games.gateway.ts`
  - `scheduleGameTimeout()` uses a small buffer to reduce premature timeouts due to latency.

## 3. What We Completed in Phase 11 (So Far)

### 3.1 Backend: Gateway + authoritative updates

- Implemented `GamesGateway` Socket.IO handlers (matchmaking, joining games, making moves, draw offer workflow, disconnect-forfeit grace window, and timeouts).
- Implemented server-side game state emission via `emitGameStateUpdate(gameId, payload)` on every accepted move.
- Added optional WS authentication (`WsOptionalJwtGuard`) and used socket `client.data.user` for player association.
- Added REST clock endpoint (`GET /games/:id/clock`) and system time endpoint (`GET /system/time`) to support client time sync.

### 3.2 Backend: Persistence / hydration

- Added board reconstruction from persisted moves via `Game.rehydrateMoves(...)` in `PrismaGameRepository` so the board state is stable across page reloads and reconnections.

### 3.3 Frontend: Online game integration + UX validation

- Implemented a stable socket lifecycle in the game page (local socket manager to avoid race conditions / hook instability).
- Implemented coordinate conversion utilities and consistent viewer perspective (including BLACK flip).
- Integrated `@tzdraft/cake-engine` for local move generation and immediate illegal-move prevention.
- Added legal move highlighting + mandatory capture enforcement in the `Board` component.

## 4. Challenges (Current + Resolved) and How We Handle Them

### 4.1 Coordinate systems (1-32 vs 8x8 UI)

- **Problem**: Backend/game rules operate on 1-32 playable squares; UI is 0-63 (8x8). Additionally, we want a consistent "player is at the bottom" viewing experience.
- **Approach**: Centralize mapping in `frontend/src/lib/game/board-coords.ts` and ensure every UI interaction converts display index -> board index -> engine `Position` -> server position (and the reverse for rendering).

### 4.2 Rule parity (frontend engine vs backend validation)

- **Problem**: The frontend filters interactions using `CakeEngine.generateLegalMoves`, but the backend is still authoritative. Any mismatch becomes a desync/UX bug (client shows move as legal, server rejects it).
- **Approach**:
  - Treat backend `MoveValidationService` as source of truth.
  - Keep frontend engine validation as a UX optimization only.
  - When a rejection happens, show a clear UI error and rely on `gameStateUpdated` to resync.

### 4.3 Move ordering + moveNumber correctness

- **Problem**: In real-time systems, relying on in-memory move counts can drift from persisted reality (especially after refresh or simultaneous requests).
- **Approach**: `MakeMoveUseCase` uses `IMoveRepository.countByGameId()` and rewrites the move's `moveNumber` to match the DB sequence.

### 4.4 Circular dependencies (Gateway <-> UseCases)

- **Problem**: `GamesGateway` needs to call use cases, and use cases need to emit events via the gateway.
- **Approach**: Use Nest's `forwardRef` + explicit injection boundaries to keep modules injectable without breaking the graph.

### 4.5 Reconnect/disconnect edge cases

- **Problem**: Player refresh, network drop, or device sleep causes duplicate sockets, missing `joinGame`, or desynced UI state.
- **Approach**:
  - `GamesGateway` uses a disconnect grace period and emits `playerDisconnected` / `playerReconnected` events.
  - `GamePage` rejoins the room on connect and relies on server broadcasts + REST re-pull as needed.

## 5. Updated Project Map (Phase 11 Snapshot)

This snapshot follows the same structure as `docs/project_map/PROJECT_MAP.md`, but only lists the **Phase 11-relevant** modules and files.

Last updated: 2026-02-19

## Repo Layout

```text
TzDraft/
  backend/       NestJS API (REST + WebSocket)
  frontend/      Next.js app (App Router)
  packages/      Shared packages (includes cake-engine)
  docs/          Documentation
```

## Backend Map (Phase 11)

```text
backend/
  src/
    auth/
      guards/
        ws-optional-jwt.guard.ts        Optional WS auth (guest-friendly)
    application/
      use-cases/
        make-move.use-case.ts           Validate/apply/persist + emit updates
        get-game-state.use-case.ts      HTTP game snapshot (game+moves+players)
        get-legal-moves.use-case.ts     Server legal-move generation (debug/tools)
    domain/
      game/
        entities/
          game.entity.ts                Aggregate root + rehydrateMoves()
        services/
          move-validation.service.ts    Authoritative rule enforcement
          game-rules.service.ts         Game-over rules (to re-enable in move flow)
        value-objects/
        board-state.vo.ts             Canonical board representation (1-32)
    infrastructure/
      messaging/
        games.gateway.ts                Socket.IO events + timers + disconnect grace
      repositories/
        prisma-game.repository.ts       Hydration + persistence
        prisma-move.repository.ts       Move persistence + counting
    interface/
      http/
        controllers/
          game.controller.ts            `GET /games/:id` + `GET /games/:id/clock`
          system.controller.ts          `GET /system/time`
```

## Frontend Map (Phase 11)

```text
frontend/
  src/
    app/
      [locale]/game/
        online/page.tsx                 Matchmaking UI (findMatch/cancelMatch)
        [id]/page.tsx                   Online game runtime (socket + board + clock)
    components/
      game/
        Board.tsx                       Interaction rules + highlighting
        LoadingBoard.tsx                Skeleton/loading state
    hooks/
      useSocket.ts                      Shared socket hook (used by matchmaking page)
    lib/
      game/
        board-coords.ts                 1-32 <-> 8x8 mapping + flip helpers
        ui-legal-moves.ts               Cake engine legal move computation for UI
      server-time.ts                    Server time offset + TTL cache
    services/
      game.service.ts                   HTTP client wrapper for game endpoints
```

## 6. Next Steps (Phase 12 Preview)

- **Re-enable and verify game-over detection** in the move pipeline (win/loss/draw) using the now-stable board hydration.
- **Harden clocks**: ensure end-game on timeout is consistent across refresh/reconnect and client UI never "shows time left" after server has flagged timeout.
- **Unify socket client implementation** (GamePage local socket vs `useSocket`) to prevent drift in auth headers/env vars and reduce duplicated logic.
- **Polish**: move animations, sounds, chat, and better error surfaces (server rejection -> clear UI message).
