# Phase 4 — Online PvP Implementation Plan

**Branch:** `feat/mobile-api-connectivity`
**Scope:** Full real-time online player-vs-player game flow for the TzDraft mobile app.

---

## Overview

Phase 4 wires the mobile app into the existing backend WebSocket + REST game system.
The backend already supports matchmaking queues, invite codes, move submission, and game events.
Phase 4 makes the mobile app consume all of that end-to-end.

---

## Milestones

### P4.1 — WebSocket Connection Layer (`useSocket.ts`)

**File:** `apps/mobile/src/hooks/useSocket.ts`

- Singleton Socket.IO client connecting to `${API_URL}/games` namespace
- Attaches JWT access token from `authStore` on connect
- Auto-reconnect with exponential backoff (max 5 retries)
- Exposes: `socket`, `isConnected`, `connect()`, `disconnect()`
- Disconnect on logout via `authStore` subscription

**Events handled at transport level:**
- `connect` / `disconnect` / `connect_error`

---

### P4.2 — Matchmaking (`useMatchmaking.ts` + `lobby.tsx` rewire)

**Files:**
- `apps/mobile/src/hooks/useMatchmaking.ts` (new)
- `apps/mobile/app/game/lobby.tsx` (rewire existing UI)

**Flow:**
1. User picks time control → `POST /matchmaking/join` with `{ timeControl }`
2. Hook polls or listens on WS for `matchFound` event
3. On `matchFound`: navigate to `/game/online/[id]`
4. On unmount / cancel: `POST /matchmaking/leave`

**State exposed:** `status: 'idle' | 'searching' | 'found'`, `gameId`, `join()`, `cancel()`

---

### P4.3 — Live Game State (`useOnlineGame.ts` + `online-game.service.ts`)

**Files:**
- `apps/mobile/src/hooks/useOnlineGame.ts` (new)
- `apps/mobile/src/services/online-game.service.ts` (new)

**`online-game.service.ts`:**
- `getGame(id)` → `GET /games/:id`
- `makeMove(gameId, from, to)` → `POST /games/:gameId/moves`
- `offerDraw(gameId)` → `POST /games/:gameId/draw-offer`
- `resign(gameId)` → `POST /games/:gameId/resign`

**`useOnlineGame.ts`:**
- Loads initial game state via `getGame`
- Joins WS room: `emit('joinGame', gameId)`
- Listens for `gameStateUpdated` → update board, clocks, turn
- Listens for `gameOver` → show result overlay
- Listens for `drawOffered` / `drawDeclined`
- Listens for `playerDisconnected` / `playerReconnected`
- Exposes: `game`, `board`, `myColor`, `isMyTurn`, `clocks`, `makeMove()`, `offerDraw()`, `resign()`

---

### P4.4 — Online Game Board Screen (`app/game/online/[id].tsx`)

**File:** `apps/mobile/app/game/online/[id].tsx` (new)

**UI Sections:**
- Opponent info bar (displayName, rating, clock countdown)
- `DraughtsBoard` — interactive only when `isMyTurn`
- My info bar (displayName, rating, clock countdown)
- Action bar: Draw Offer button + Resign button

**Overlays (Modal-based):**
- `DrawOfferOverlay` — shown when opponent offers draw; Accept / Decline
- `ResignConfirmOverlay` — confirmation before resign
- `DisconnectOverlay` — shown when opponent disconnects; countdown to claim win or wait
- `GameResultModal` — win / loss / draw with rating delta + Rematch / Home buttons

**Clock logic:**
- Decrement active player's clock every second via `setInterval`
- Sync from server `gameStateUpdated` payloads to prevent drift
- Flash red below 10 seconds

---

### P4.5 — Friend Game Flow (`setup-friend.tsx` rewire + `app/game/invite/[code].tsx`)

**Files:**
- `apps/mobile/app/game/setup-friend.tsx` (rewire existing UI)
- `apps/mobile/app/game/invite/[code].tsx` (new — deep-link join screen)

**Create flow:**
1. `POST /games/invite` → receive `{ gameId, inviteCode }`
2. Show invite code + Share sheet (via `Share.share`)
3. Listen on WS for `gameReady` (opponent joined) → navigate to `/game/online/[gameId]`

**Join flow:**
1. User enters code or taps deep link (`tzdraft://invite/CODE`)
2. `POST /games/invite/:code/join`
3. Navigate to `/game/online/[gameId]`

**Deep link handler:** configured in `app.json` scheme `tzdraft` + `expo-linking`

---

### P4.6 — Game Result Modal (`GameResultModal`)

**File:** `apps/mobile/src/components/GameResultModal.tsx` (new)

**Props:** `result: 'win' | 'loss' | 'draw'`, `ratingBefore`, `ratingAfter`, `reason`, `onRematch`, `onHome`

**Content:**
- Result headline with icon (trophy / shield / handshake)
- Rating change: `+12` in green or `-8` in red
- Reason string (timeout, resignation, agreement, checkmate-equivalent)
- Two CTA buttons: Rematch (if opponent still connected) + Back to Home

---

### P4.7 — Reconnect Handling

**File:** `apps/mobile/src/hooks/useOnlineGame.ts` (part of P4.3)

- `AppState` listener: on `active` after background → re-join WS room, re-fetch game state
- If game is over on reconnect → show `GameResultModal` immediately
- If it is opponent who disconnected → show `DisconnectOverlay` with countdown

---

## Data Contracts (matching existing backend)

### WS Events (server → client)
| Event | Payload |
|---|---|
| `gameStateUpdated` | `{ gameId, fen, turn, clocks, lastMove, status }` |
| `gameOver` | `{ gameId, result, winnerId, reason, ratingDeltas }` |
| `drawOffered` | `{ gameId, offeredBy }` |
| `drawDeclined` | `{ gameId }` |
| `playerDisconnected` | `{ gameId, userId, claimWinAt }` |
| `playerReconnected` | `{ gameId, userId }` |
| `matchFound` | `{ gameId, opponentId, color }` |
| `gameReady` | `{ gameId }` |

### WS Events (client → server)
| Event | Purpose |
|---|---|
| `joinGame` | Subscribe to game room |
| `leaveGame` | Unsubscribe |

### REST Endpoints (existing backend)
| Method | Path | Purpose |
|---|---|---|
| POST | `/matchmaking/join` | Enter queue |
| POST | `/matchmaking/leave` | Leave queue |
| GET | `/games/:id` | Fetch game state |
| POST | `/games/:id/moves` | Submit move |
| POST | `/games/:id/draw-offer` | Offer draw |
| POST | `/games/:id/resign` | Resign |
| POST | `/games/invite` | Create invite game |
| POST | `/games/invite/:code/join` | Join invite game |

---

## File Creation Order

1. `online-game.service.ts`
2. `useSocket.ts`
3. `useMatchmaking.ts` + `lobby.tsx` rewire
4. `useOnlineGame.ts`
5. `GameResultModal.tsx`
6. `app/game/online/[id].tsx`
7. `setup-friend.tsx` rewire + `app/game/invite/[code].tsx`
8. Translation keys (`en.json` + `sw.json`) for all new strings
9. Deep link config (`app.json`)

---

## Translation Keys to Add (Phase 4)

```
online.connecting
online.searching
online.searchingFor
online.cancelSearch
online.opponentFound
online.yourTurn
online.opponentTurn
online.offerDraw
online.resign
online.resignConfirm
online.resignCancel
online.drawOffered
online.acceptDraw
online.declineDraw
online.disconnected
online.reconnecting
online.claimWin
online.waitingReconnect
result.win
result.loss
result.draw
result.reason.timeout
result.reason.resignation
result.reason.agreement
result.ratingChange
result.rematch
result.backHome
invite.create
invite.yourCode
invite.share
invite.join
invite.enterCode
invite.joining
invite.waitingOpponent
```

---

## Out of Scope for Phase 4

- Spectator mode
- Tournament bracket games (separate phase)
- Chat / emoji reactions
- Game analysis post-game (covered by studies/replay — Phase 3)
