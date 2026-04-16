# TzDraft Mobile — Development Plan

## Phase 1 — Auth Shell (COMPLETED 2026-04-13)
Bootstrapped the Expo Router app with auth, navigation, and guest support.

### What was built
- Expo Router file-based navigation with `_layout.tsx` root provider
- Google OAuth login via backend `/auth/google`
- Email/password login + signup screens (`(auth)/login.tsx`, `(auth)/signup.tsx`)
- Guest sessions — ephemeral, welcome page shown on every launch
- `useAuthStore` (Zustand) — stores user + token, persisted via AsyncStorage
- `useAuthInitializer` hook — rehydrates session on cold start
- Home screen (`app/index.tsx`) — service cards, stats grid, recent results, guest popup
- Push notification permission request on auth

### Key files
- `app/_layout.tsx` — root layout, MkaguziProvider mount point
- `src/auth/auth-store.ts` — Zustand store for user/token
- `src/hooks/useAuthInitializer.ts` — session rehydration
- `app/(auth)/login.tsx`, `app/(auth)/signup.tsx` — auth screens
- `app/welcome.tsx` — landing page for unauthenticated users

---

## Phase 2 — Play vs AI (COMPLETED 2026-04-14)
Offline AI gameplay using the Mkaguzi WASM engine inside a hidden WebView.

### What was built
- Mkaguzi WASM bridged into React Native via a hidden `<WebView>` (react-native-webview)
- WASM binary inlined as base64 in a self-contained HTML string (271 KB)
- Promise-map pattern for async RN ↔ WebView messaging
- `MkaguziProvider` mounts in `_layout.tsx`; `useMkaguzi()` hook exposes the bridge
- `useAiGame` hook — full game loop: board state, move validation, AI triggering, timers, result detection
- `DraughtsBoard` component — 8×8 board, piece rendering, tap-to-select, highlight system
- `Piece` component — man/king rendering with correct TZD piece colors
- 19-level bot progression: levels 1-5 free for guests, all 19 for registered users
- Bot unlock stored in AsyncStorage key `"tzdraft-bot-progress"`
- `vs-ai.tsx` screen — full game UI: resign modal, options modal, result modal, tier-unlock overlay, move history strip, per-move + total time controls, audio

### Key files
- `src/lib/game/wasm-bridge-html.ts` — auto-generated, do not edit (run `node scripts/generate-wasm-bridge.js` to regenerate)
- `src/lib/game/mkaguzi-mobile.tsx` — MkaguziProvider + useMkaguzi()
- `src/lib/game/bridge-types.ts` — RawMove, RawSearchResult, RawGameResult
- `src/lib/game/ai-search.ts` — LEVEL_PARAMS (depth + randomness per level) + getBestMove()
- `src/lib/game/bot-progression.ts` — unlock tracking, AsyncStorage persistence
- `src/hooks/useAiGame.ts` — game loop hook
- `src/components/game/DraughtsBoard.tsx` — board UI
- `src/components/game/Piece.tsx` — piece UI
- `app/game/setup-ai.tsx` — bot selector + color/time control setup
- `app/game/vs-ai.tsx` — game screen

### Architecture decisions
- Engine runs in WebView because React Native has no WASM runtime
- Engine warms up at app start so the game screen opens instantly
- Bot image assets in `assets/bots/`; bot metadata in `src/lib/game/bots.ts`

---

## Phase 3 — Free Play Completion (COMPLETED 2026-04-15)
Completed the Free Play screen that was stubbed in Phase 2. Free Play lets a single user control both sides for analysis or teaching purposes.

### What was broken before this phase
- History scrubbing showed the live board regardless of which move was selected — `displayBoard` was never derived from `displayFen`
- Game never ended — no result detection; `result` was hardcoded `null`
- `selectSquare` was defined in `useFreeGame` but never included in the return object — tapping pieces did nothing
- Settings buttons (top-right icon + bottom action bar) were no-ops
- No options modal, no result modal
- No game-start audio
- Undo/Reset buttons had hardcoded disabled colors regardless of state

### What was fixed and added

#### `src/hooks/useFreeGame.ts`
- Added `FreeGameResult` interface: `{ winner: "WHITE" | "BLACK" | "DRAW"; reason: string }`
- Added `result` state — triggered when `nextMoves.length === 0` after a move (the player who just moved wins; TZD: no legal moves = loss)
- Added `moveCount` to the return object
- Fixed: `selectSquare` now included in the hook's return value
- Fixed: `selectSquare` guards against input when `result !== null`
- `undo` clears `result` (allows stepping back past a finished game)
- `reset` clears `result`

#### `app/game/free-play.tsx`
- **History scrubbing** — `displayBoard = BoardState.fromFen(displayFen)` when `activeIndex < liveIndex`; `displayLastMove` derived from `moveHistory[activeIndex - 1]`; both passed to `<DraughtsBoard>`
- **OptionsModal** — mute/unmute toggle (Switch + Volume2/VolumeX icons) + Go to Lobby; opened by both Settings buttons
- **FreePlayResultModal** — Crown icon (win) or Minus (draw); dynamic accent color; stats row (MOVES / RESULT / MODE); Reset + Home actions
- **Audio** — `playGameStart()` on engine ready; `playGameEnd("win"|"draw")` on result via `prevResultRef` guard
- **Board disabled** when `isViewingHistory || !!game.result`
- **Action bar** — Undo and Reset icons/labels now reflect active vs inactive state correctly

### Key files
- `src/hooks/useFreeGame.ts` — game loop hook for free play
- `app/game/free-play.tsx` — screen UI

### Game-over rule implemented
In TZD, a player with no legal moves **loses**. After each move, `nextMoves` is generated for the incoming player. If `nextMoves.length === 0`, `result.winner` is set to the player who just moved. No draw condition is implemented at this layer (draw by 30-move rule etc. is enforced by the engine and backend in ranked play, not in free play).

### Translations
Added `freePlay.result.*` keys to `packages/translations/src/en.json` and `sw.json`:
`whiteWins`, `blackWins`, `draw`, `noMovesForBlack`, `noMovesForWhite`, `drawEnded`.
Modal strings are currently hardcoded English; translation keys are ready to wire in.

---

## Phase 4 — Online Features (PLANNED)
Connect the mobile app to the backend for real matches.

### Planned items
- Save completed AI games to backend (POST `/games` with AI type)
- Bot progression synced to user account (replace AsyncStorage-only)
- Online matchmaking (lobby → game screen)
- Play vs Friend mobile end-to-end (invite code flow, same as web)
- Piece movement animations (Reanimated)
- Reconnect / resume interrupted games
- Push notification for "your turn" in async games
