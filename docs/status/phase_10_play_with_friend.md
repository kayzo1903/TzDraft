# Phase 10: Play with Friend (Frontend + Backend)

## Goal

Deliver a complete "Play with Friend" experience with:

1. Local pass-and-play on one device.
2. Online friend invites with real-time play.
3. Full lifecycle support: create, join, move, draw, resign, abort.

## Scope

This phase covers:

1. Frontend setup and game screens.
2. Backend HTTP invite/game endpoints.
3. Backend WebSocket room events for real-time sync.
4. Data contracts used between frontend and backend.

## Frontend Implementation

### 1. Setup Screen

File: `frontend/src/app/[locale]/game/setup-friend/page.tsx`

Tabs:

1. `Local`:
   - Select color (`WHITE | BLACK | RANDOM`)
   - Select time (`0, 5, 10, 15` minutes)
   - Toggle pass-device handoff screen
   - Navigates to `/game/local-pvp`

2. `Online`:
   - Requires authentication.
   - Create invite:
     - Calls `gameService.createInvite({ color, timeMs })`
     - Receives `gameId` + `inviteCode`
     - Shows invite code + QR + copyable link
   - Join invite:
     - Calls `gameService.joinInvite(code)`
     - Redirects to `/game/{gameId}`

### 2. Online Game Screen

File: `frontend/src/app/[locale]/game/[id]/page.tsx`

Core behavior:

1. Uses `useOnlineGame(gameId)` hook for board state, legal moves, clocks, and draw flow.
2. Shows waiting overlay when only one player is present.
3. Supports invite auto-join via URL query `?code=XXXXXX`.
4. If unauthenticated during auto-join:
   - Creates guest account.
   - Then attempts `joinInvite`.
5. Supports actions:
   - Offer/cancel/accept/decline draw
   - Resign
   - Abort (before game starts)

### 3. Frontend Service Contracts

File: `frontend/src/services/game.service.ts`

Key methods:

1. `POST /games/invite` via `createInvite`
2. `POST /games/invite/:code/join` via `joinInvite`
3. `GET /games/:id` via `getGame`
4. `POST /games/:id/moves` via `makeMove`
5. `POST /games/:id/resign` via `resign`
6. `POST /games/:id/draw` via `offerDraw` (HTTP fallback path)
7. `POST /games/:id/abort` via `abort`

### 4. Realtime Socket Behavior

File: `frontend/src/hooks/useSocket.ts`

1. Connects to namespace: `${NEXT_PUBLIC_API_URL}/games`
2. Auth token sent in:
   - `handshake.auth.token`
   - `Authorization` header
3. Persistent shared socket instance avoids duplicate room listeners.

File: `frontend/src/hooks/useOnlineGame.ts`

1. On connect: emits `joinGame(gameId)`.
2. Subscribes:
   - `gameStateUpdated`
   - `gameOver`
   - `drawOffered`
   - `drawDeclined`
   - `drawCancelled`
3. Move submission path:
   - Optimistic local apply
   - `socket.emitWithAck("makeMove", { gameId, from, to })`
   - On ack error, refetches game state

## Backend Implementation

### 1. Game HTTP Controller

File: `backend/src/interface/http/controllers/game.controller.ts`

Invite endpoints:

1. `POST /games/invite`
   - Creates waiting game + invite code
   - Returns `{ gameId, inviteCode }`

2. `POST /games/invite/:code/join`
   - Joins waiting invite game
   - Emits room update so host UI exits waiting state

Game state endpoint:

1. `GET /games/:id`
   - Returns game, moves, and player metadata

Actions:

1. `POST /games/:id/resign`
2. `POST /games/:id/draw`
3. `POST /games/:id/abort`

### 2. Invite Domain Logic

File: `backend/src/application/use-cases/create-game.use-case.ts`

Invite flow:

1. `createInviteGame(...)`
   - Generates 6-char invite code
   - Creates CASUAL game in `WAITING`
   - Stores code in game record
2. `joinInviteGame(code, joinerId)`
   - Validates invite exists and is still joinable
   - Prevents joining own game
   - Assigns joiner to second seat and starts game

### 3. WebSocket Gateway

File: `backend/src/infrastructure/messaging/games.gateway.ts`

Namespace: `/games`

Socket events:

1. `joinGame` -> adds socket to game room
2. `makeMove` -> validates and executes move via use case, returns ack
3. `offerDraw` -> broadcasts `drawOffered`
4. `acceptDraw` -> ends game as draw, broadcasts `gameOver`
5. `declineDraw` -> broadcasts `drawDeclined`
6. `cancelDraw` -> broadcasts `drawCancelled`

Emit helpers:

1. `emitGameStateUpdate(gameId, payload)` -> `gameStateUpdated`
2. `emitGameOver(gameId, payload)` -> `gameOver`

## Data Model

File: `backend/prisma/schema/game.prisma`

Fields used by friend mode:

1. `status` (`WAITING | ACTIVE | FINISHED | ABORTED`)
2. `gameType` (`CASUAL` for invite friend games)
3. `whitePlayerId`
4. `blackPlayerId` (nullable while waiting)
5. `inviteCode` (unique, nullable)
6. `winner`
7. `createdAt | startedAt | endedAt`

## End-to-End Flow

1. Host opens setup-friend online tab.
2. Host creates invite via `POST /games/invite`.
3. UI receives `gameId + inviteCode`, renders QR/link.
4. Friend opens link and joins via `POST /games/invite/:code/join`.
5. Backend emits `gameStateUpdated` to room.
6. Both clients in room receive updates and render board active.
7. Moves sent over socket `makeMove` with optimistic frontend updates.
8. Draw/resign/abort handled by socket or HTTP action endpoints.
9. `gameOver` event ends session and displays result.

## Phase 10 Acceptance Criteria

1. Host can create invite and receive code.
2. Friend can join with code or link.
3. Host waiting screen disappears immediately after join.
4. Real-time moves are synchronized for both players.
5. Draw flow works (offer, accept/decline/cancel).
6. Resign and abort endpoints update both clients correctly.
7. Game result is shown consistently after `gameOver`.

