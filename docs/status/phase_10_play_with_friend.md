# Phase 10: Play with Friend (Frontend + Backend)

## Goal

Deliver a complete "Play with Friend" experience with:

1. Local pass-and-play on one device.
2. Online friend invites with real-time play.
3. Full lifecycle support: create, join, host-start, move, draw, resign, abort, rematch.

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
   - Select time (`5, 10, 15` minutes)
   - Toggle pass-device handoff screen
   - Navigates to `/game/local-pvp`

2. `Online`:
   - Requires authentication.
   - Create invite:
     - Calls `gameService.createInvite({ color, timeMs })`
     - Auto-expires prior stale WAITING invites for the creator.
     - Receives `gameId` + `inviteCode`
     - Shows invite code + QR + copyable link + WhatsApp share

### 2. Online Game Screen

File: `frontend/src/app/[locale]/game/[id]/page.tsx`

Core behavior:

1. Uses `useOnlineGame(gameId)` hook for board state, legal moves, clocks, rematch and draw flow.
2. Shows waiting banner when only one player is present.
3. Supports invite auto-join via URL query `?code=XXXXXX`.
4. If unauthenticated during auto-join:
   - Creates a temporary guest account.
   - Then attempts `joinInvite`.
5. **Host-Controlled Start Flow**:
   - Guest user joins the room (`joinInvite`) which simply takes an available player slot but does not start the game.
   - Host sees "Opponent Joined" and a "Start Game" button.
   - Guest sees "Waiting for host to start the game."
   - Host calling `startGame` activates the game board for both players.
6. Supports actions:
   - Offer/cancel/accept/decline draw
   - Resign
   - Abort (before game starts)
   - Offer/accept/decline/cancel Rematch (swaps colors and creates new game instantly)

### 3. Frontend Service Contracts

File: `frontend/src/services/game.service.ts`

Key methods:

1. `POST /games/invite` via `createInvite`
2. `POST /games/invite/:code/join` via `joinInvite` (Assigns player slot, leaves game WAITING)
3. `POST /games/:id/start` via `startGame` (Starts the game, transitions host/guest to ACTIVE)
4. `GET /games/:id` via `getGame`
5. `POST /games/:id/moves` via `makeMove`
6. `POST /games/:id/resign` via `resign`
7. `POST /games/:id/draw` via `offerDraw` (HTTP fallback path)
8. `POST /games/:id/abort` via `abort`

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
   - `gameStateUpdated` (Optimized to process payloads instantly rather than re-triggering heavy HTTP fetches)
   - `gameOver`
   - `drawOffered`, `drawDeclined`, `drawCancelled`
3. Move submission path:
   - Optimistic local apply
   - `socket.emitWithAck("makeMove", { gameId, from, to })`

## Backend Implementation

### 1. Game HTTP Controller

File: `backend/src/interface/http/controllers/game.controller.ts`

Invite endpoints:

1. `POST /games/invite`
   - Aborts any existing stale WAITING invites for the creator.
   - Creates a waiting game + invite code.
   - Returns `{ gameId, inviteCode }`

2. `POST /games/invite/:code/join`
   - Joins waiting invite game (assigns player slot).
   - Emits room update so host UI detects guest arrival.

3. `POST /games/:id/start`
   - Validates that creator is starting it and both slots are filled.
   - Activates game, resets clocks, and notifies guests.

Game state endpoint:

1. `GET /games/:id`
   - Returns game, moves, player metadata.
   - (Engineering feature) Prisma historical move replay is used on load to properly reconstruct deep board states.

### 2. Invite Domain Logic

File: `backend/src/application/use-cases/create-game.use-case.ts`

Invite flow:

1. `createInviteGame(...)`
   - Generates 6-char invite code.
   - Creates CASUAL game in `WAITING`.
2. `joinInviteGame(code, joinerId)`
   - Validates invite is WAITING and not owned by self.
   - Fills empty slot but leaves game WAITING.
3. `startGame(gameId, requesterId)`
   - Transitions game to ACTIVE state.

### 3. WebSocket Gateway

File: `backend/src/infrastructure/messaging/games.gateway.ts`

Namespace: `/games`

Socket events:

1. `joinGame` -> adds socket to game room, enforces 1-active-game-at-a-time limit per user.
2. `makeMove` -> validates and executes move via use case, returns ack.
3. `offerDraw`, `acceptDraw`, `declineDraw`, `cancelDraw`
4. Post-match rematch events: `offerRematch`, `acceptRematch`, etc.

Emit helpers:

1. `emitGameStateUpdate(gameId, payload)` -> `gameStateUpdated`
2. `emitGameOver(gameId, payload)` -> `gameOver`

## Data Model

File: `backend/prisma/schema/game.prisma`

Fields used by friend mode:

1. `status` (`WAITING | ACTIVE | FINISHED | ABORTED`)
2. `gameType` (`CASUAL` for invite friend games)
3. `whitePlayerId`
4. `blackPlayerId` (nullable while waiting, filled on guest join)
5. `inviteCode` (unique, nullable)
6. `winner`
7. `createdAt | startedAt | endedAt`

## End-to-End Flow (Final Implemented State)

1. Host opens setup-friend online tab.
2. Host creates invite via `POST /games/invite`.
3. UI receives `gameId + inviteCode`, renders QR/link and WhatsApp Share button.
4. Friend opens link (or auto-joins via guest account if not logged in).
5. Friend calls `POST /games/invite/:code/join`. The guest slot is filled.
6. Backend emits `gameStateUpdated` to room.
7. Host's WaitingBanner changes to "Opponent Joined" with a "Start Game" button. Friend's screen says "Waiting for host".
8. Host clicks "Start Game" -> calls `POST /games/:id/start`. Game enters `ACTIVE` state.
9. WS emits state update to both clients. Board renders interactively.
10. Real-time moves use WS payloads to ensure sub-100ms UI latency.
11. Optional: Draw/Resign/Abort/Rematch flows triggered.
12. `gameOver` event ends the session and displays results correctly.

## Phase 10 Final Acceptance Criteria

1. [x] Host can create invite and receive code.
2. [x] Stale unused invites auto-expire (Aborted after 30m or when creating new).
3. [x] Friend can join with code or link.
4. [x] Host manually controls the actual game start logic.
5. [x] Player color assignments are correct (host/guest map correctly).
6. [x] Real-time moves are synchronized with ultra-low latency.
7. [x] Historical moves replay on DB load to prevent board state bugs.
8. [x] Draw flow works (offer, accept, decline, cancel).
9. [x] Rematch flow works with instant game recreation.
10. [x] Resign and Abort actions reliably reflect across screens.
11. [x] Game result is shown consistently after `gameOver`.
