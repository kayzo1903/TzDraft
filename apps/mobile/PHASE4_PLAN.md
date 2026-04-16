# Phase 4 — Online PvP

Full implementation plan for live ranked and friend-invite games on mobile.

---

## Current State

| Layer | Status |
|---|---|
| Backend WS gateway | **Complete** — `matchFound`, `gameStateUpdated`, `drawOffered`, `drawAccepted`, `playerDisconnected`, `abandonCountdown`, `gameAbandoned`, `rematch`, reconnect all implemented |
| Backend HTTP | **Complete** — `POST /games/queue`, `POST /games/invite`, `POST /games/invite/:code/join`, `POST /games/:id/moves`, resign/draw WS events |
| `app/game/lobby.tsx` | **UI only** — "Find Opponent" sets local state, never calls the API |
| `app/game/setup-friend.tsx` | **UI only** — "Create Game" and "Join Game" buttons have no handlers |
| Online game board (mobile) | **Does not exist** — no screen, no hook, no socket client |

Everything is built on the backend. Phase 4 is 100% mobile work.

---

## Files To Create / Modify

```
apps/mobile/src/hooks/
  useSocket.ts              ← NEW   P4.1
  useMatchmaking.ts         ← NEW   P4.2
  useOnlineGame.ts          ← NEW   P4.3

apps/mobile/src/services/
  online-game.service.ts    ← NEW   P4.3

apps/mobile/app/game/
  lobby.tsx                 ← REWRITE wiring   P4.2
  setup-friend.tsx          ← REWRITE wiring   P4.5
  online/
    [id].tsx                ← NEW   P4.4
  invite/
    [code].tsx              ← NEW   P4.5
```

---

## P4.1 — `useSocket.ts`

**Dependency for everything else. Build first.**

A singleton hook that opens one authenticated Socket.IO connection to
`${API_URL}/games` and keeps it alive for the app session.

### Responsibilities
- Connect with `auth: { token }` taken from `useAuthStore`
- Auto-reconnect with exponential backoff on drop
- Expose: `socket`, `connected: boolean`
- Disconnect cleanly on logout

### Key details
- Namespace: `/games` (matches backend `@WebSocketGateway({ namespace: 'games' })`)
- Auth token sent in handshake; backend `WsJwtGuard` validates it
- Single instance shared across hooks via React context or module-level singleton

---

## P4.2 — `useMatchmaking.ts` + rewire `lobby.tsx`

### Hook responsibilities
1. `POST /games/queue` with `{ timeControl, rated }` → receive `queueId`
2. Join WS room `queue:${queueId}`, listen for `matchFound` → `{ gameId }`
3. On `matchFound` → navigate to `app/game/online/[id]`
4. Cancel → `DELETE /games/queue` + leave WS room

### Exposes
```ts
{
  isSearching: boolean
  searchSeconds: number        // elapsed, not countdown
  cancel: () => void
  startSearch: (opts: { timeControl: string; rated: boolean }) => void
}
```

### `lobby.tsx` changes
- Time control selection (Blitz 3+2 / Rapid 10+5 / Classic 30+0) becomes stateful and passes selected value to `startSearch`
- "Find Opponent" button calls `startSearch` — no more fake timer
- Online player count and active games fetched from `GET /games/stats` on mount
- Cancel button calls `cancel()` which hits the real API

---

## P4.3 — `useOnlineGame.ts` + `online-game.service.ts`

The core hook for a live match. Mirrors `useFreeGame` / `useAiGame` pattern but over the network.

### `online-game.service.ts` (HTTP)
```ts
getGame(id)         → GET  /games/:id        (initial board + clock state)
submitMove(id, from, to)  → POST /games/:id/moves
```

### `useOnlineGame.ts` (WS + state)

**On mount:**
- Call `getGame(id)` to hydrate board, clock, move history, myColor
- Join WS room `game:${gameId}` by emitting `joinGame`

**WS events consumed:**
| Event | Action |
|---|---|
| `gameStateUpdated` | Update board, fen, currentPlayer, re-sync clocks |
| `drawOffered` | Set `drawOffer: { from }` — triggers modal |
| `drawAccepted` | Set result as DRAW |
| `drawDeclined` | Clear draw offer state |
| `playerDisconnected` | Set `opponentDisconnected: true`, show banner |
| `abandonCountdown` | Set `abandonSeconds` — countdown banner ticks |
| `gameAbandoned` | Set result (opponent forfeited) |
| `gameEnded` | Set result with winner + rating deltas |
| `rematchAccepted` | Navigate to new game id |

**WS events emitted:**
| Event | When |
|---|---|
| `joinGame` | On mount and on reconnect |
| `makeMove` | After legal-move check passes locally |
| `resign` | User confirms resign |
| `offerDraw` | User taps "Offer Draw" |
| `acceptDraw` | User accepts incoming draw offer |
| `declineDraw` | User declines incoming draw offer |
| `rematch` | User taps "Rematch" after result |

**Exposes:**
```ts
{
  board: BoardState
  fen: string
  currentPlayer: PlayerColor
  legalMoves: RawMove[]
  myColor: 'WHITE' | 'BLACK'
  myTime: number           // ms remaining
  opponentTime: number
  opponentName: string
  opponentRating: number
  moveHistory: MoveRecord[]
  result: GameResult | null
  drawOffer: { from: string } | null
  opponentDisconnected: boolean
  abandonSeconds: number | null
  isConnected: boolean
  selectSquare: (pdn: number) => void
  resign: () => void
  offerDraw: () => void
  acceptDraw: () => void
  declineDraw: () => void
  rematch: () => void
}
```

**Clock logic:**
- `setInterval` ticking the active player's clock locally
- Re-seeded from server time on every `gameStateUpdated` (avoids drift)
- Stops when `result` is set

**Reconnect (P4.7):**
- `AppState` listener: on `active` after `background`, re-emit `joinGame`
- Show "Reconnecting…" overlay until next `gameStateUpdated` arrives

---

## P4.4 — `app/game/online/[id].tsx`

The live game board screen.

### Layout (top to bottom)
```
┌─────────────────────────────────────────┐
│ TopBar                                  │
│  ← (resign confirm) | RATED badge |    │
│  time-control label  |  settings ⋮     │
├─────────────────────────────────────────┤
│ OpponentRow                             │
│  avatar | displayName | rating | clock  │
├─────────────────────────────────────────┤
│                                         │
│            DraughtsBoard                │
│   (flipped when myColor === BLACK)      │
│                                         │
├─────────────────────────────────────────┤
│ MyRow                                   │
│  clock | displayName | rating           │
├─────────────────────────────────────────┤
│ HistoryBar  (scrollable move pills)     │
├─────────────────────────────────────────┤
│ ActionBar                               │
│  Resign  |  Offer Draw  |  (spacer)    │
└─────────────────────────────────────────┘
```

### Overlays / Modals
| Component | Trigger |
|---|---|
| `DisconnectBanner` | `opponentDisconnected === true` — shows "Opponent disconnected — game ends in Xs" |
| `DrawOfferModal` | `drawOffer !== null` — Accept / Decline buttons |
| `ResignConfirmModal` | User taps Resign — "Are you sure?" before emitting event |
| `GameResultModal` | `result !== null` — see P4.6 |
| `ReconnectingOverlay` | `!isConnected` after first load — full-screen spinner |

### Board interaction
- Board disabled when `currentPlayer !== myColor` or `result !== null`
- Legal moves computed from `legalMoves` returned by the hook (same pattern as AI game)
- Move tap → `selectSquare(pdn)` → hook validates and calls `submitMove` + emits `makeMove`

---

## P4.5 — `setup-friend.tsx` rewire + `app/game/invite/[code].tsx`

### Online tab — Create
1. "Create Game" → `POST /games/invite` with `{ creatorColor, timeControl }` → `{ inviteCode, gameId }`
2. Navigate to `app/game/invite/[code]` waiting room

### Online tab — Join
1. User types code → "Join Game" → `POST /games/invite/:code/join` → `{ gameId }`
2. Navigate to `app/game/online/[gameId]`

### `app/game/invite/[code].tsx` — Waiting room
- Shows invite code large + copy button + share sheet (`Share.share`)
- Animated "Waiting for opponent…" indicator
- Listens on WS for `gameStarted` → navigate to `app/game/online/[gameId]`
- Back press → confirm cancel → `DELETE /games/invite/:code`

### Local tab
- "Play Now" already navigates to `local-pvp` (already implemented in Phase 2/3)
- No changes needed

---

## P4.6 — `GameResultModal`

Inline component inside `online/[id].tsx`, shown when `result` is set.

### Content
- Win / Loss / Draw icon with themed accent colour (same pattern as `FreePlayResultModal`)
- **Rating delta** displayed prominently: `+12` green / `-8` red
- Opponent's rating delta shown smaller below
- Stats row: total moves | game duration | captures
- Buttons:
  - **Rematch** — emits `rematch` WS event; button shows "Waiting…" until `rematchAccepted`; navigates to new game
  - **Review** — navigates to `study-replay` if the game has moves (uses local fenHistory built during the game)
  - **Home** — navigates to `/`

---

## P4.7 — Reconnect handling

Add to `useOnlineGame`:

```ts
useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active' && gameId) {
      socket.emit('joinGame', { gameId });
      setIsReconnecting(true);
    }
  });
  return () => sub.remove();
}, [socket, gameId]);

// Clear reconnecting flag on next gameStateUpdated
```

`ReconnectingOverlay` — full-screen dark overlay with spinner and "Reconnecting…" text, shown while `isReconnecting && !isConnected`.

---

## Build Order

| Step | Deliverable | Depends on |
|---|---|---|
| 1 | `useSocket.ts` | nothing |
| 2 | `online-game.service.ts` | nothing |
| 3 | `useOnlineGame.ts` | 1, 2 |
| 4 | `online/[id].tsx` | 3 |
| 5 | `useMatchmaking.ts` + `lobby.tsx` | 1 |
| 6 | `setup-friend.tsx` + `invite/[code].tsx` | 1, 2 |
| 7 | Reconnect (add to `useOnlineGame`) | 3, 4 |

Steps 2 and 5 can run in parallel once Step 1 is done.

---

## Backend WS Events Reference

All events are on the `/games` namespace.

### Emitted by client
| Event | Payload |
|---|---|
| `joinGame` | `{ gameId }` |
| `makeMove` | `{ gameId, from, to }` |
| `resign` | `{ gameId }` |
| `offerDraw` | `{ gameId }` |
| `acceptDraw` | `{ gameId }` |
| `declineDraw` | `{ gameId }` |
| `rematch` | `{ gameId }` |

### Emitted by server
| Event | Payload |
|---|---|
| `matchFound` | `{ gameId }` |
| `gameStateUpdated` | full game snapshot |
| `drawOffered` | `{ from: userId }` |
| `drawAccepted` | — |
| `drawDeclined` | — |
| `playerDisconnected` | `{ userId, abandonInMs }` |
| `abandonCountdown` | `{ secondsLeft }` |
| `gameAbandoned` | `{ winner }` |
| `gameEnded` | `{ winner, reason, ratingDelta }` |
| `rematchAccepted` | `{ newGameId }` |
| `gameStarted` | `{ gameId }` (invite games) |
