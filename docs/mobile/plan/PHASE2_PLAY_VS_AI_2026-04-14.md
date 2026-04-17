# TzDraft Mobile — Phase 2: Play vs AI

**Date:** 2026-04-14
**Branch:** `feat/mobile-play-vs-ai` (branch off `feat/mobile-api-connectivity`)
**Status:** Planning — implementation starting now

---

## Goal

Deliver a fully offline, production-quality Play vs AI mode for both Android and iOS.
The AI must be the same Mkaguzi engine used on the web — not the deprecated CAKE engine —
so strength, TZD rule compliance, and level feel are identical across platforms.

Exit criterion:
> A user can open the app with no network, select any bot from level 1–5 (free tier),
> play a complete game of Tanzania Draughts, and receive a correct result.
> Registered users can access all 19 levels under the same condition.

---

## Engine decision: Mkaguzi via WebView bridge

### Why not CAKE

CAKE was the original pure-TypeScript engine, superseded by Mkaguzi because:
- Mkaguzi is C++ compiled to WASM — significantly stronger and faster
- CAKE had correctness issues on edge-case TZD rules
- Web already runs Mkaguzi exclusively; using CAKE on mobile creates divergence in play quality

### Why not run WASM directly in Hermes

Mkaguzi's `wasm-bridge.ts` loads the engine via:
- `new URL(wasmJsUrl, globalThis.location?.href)` — `location` does not exist in Hermes
- `await import(absoluteUrl)` — runtime URL dynamic import is blocked by Metro bundler
- Emscripten's ES module glue assumes browser globals that Hermes does not provide

### The solution: Self-contained WebView bridge

The Mkaguzi WASM binary is only **156 KB** and the JS glue is **58 KB**. Total: 214 KB raw,
~270 KB with base64 encoding — small enough to embed as a self-contained HTML string.

A hidden `<WebView>` loads this HTML, giving Mkaguzi a real browser runtime (WKWebView on iOS,
Chrome WebView on Android). React Native communicates with it via `postMessage`/`onMessage`
with a promise-based request/response protocol.

```
App startup
└── <MkaguziProvider> mounts hidden WebView
    └── bridge.html initializes Mkaguzi WASM inside the WebView
        └── posts { type: "ready" } when done

Game screen
└── useAiGame(botLevel, playerColor, timeSeconds)
    ├── useMkaguzi() → bridge.generateMoves / bridge.applyMove / bridge.search / bridge.gameResult
    ├── BoardState (pure-TS from @tzdraft/mkaguzi-engine) → rendering only
    └── <DraughtsBoard> → React Native touch board

postMessage protocol:
  RN → WebView:  { id, type, payload }
  WebView → RN:  { id, result } | { type: "ready" } | { type: "error", message }
```

**Why hidden WebView mounted at startup (not per-game):**
- WASM initialization takes 200–400 ms — unacceptable latency on game screen open
- Mounted once in `_layout.tsx`, lives for the app lifetime
- Engine is warm and ready before the user reaches the setup screen

---

## Architecture overview

```
apps/mobile/
├── scripts/
│   └── generate-wasm-bridge.js        ← build-time Node script (run once)
│
├── src/
│   ├── lib/game/
│   │   ├── wasm-bridge-html.ts        ← AUTO-GENERATED — do not edit manually
│   │   ├── mkaguzi-mobile.ts          ← MkaguziProvider + useMkaguzi() hook
│   │   ├── ai-search.ts               ← LEVEL_PARAMS + getBestMove()
│   │   └── bot-progression.ts         ← AsyncStorage unlock tracking
│   │
│   ├── hooks/
│   │   └── useAiGame.ts               ← game state: board, turn, timer, AI trigger
│   │
│   └── components/game/
│       ├── DraughtsBoard.tsx           ← 8×8 React Native board
│       └── Piece.tsx                  ← piece circle (man / king)
│
└── app/game/
    └── vs-ai.tsx                      ← full game screen
```

---

## Implementation steps

### Step 1 — Build script: `generate-wasm-bridge.js`

**File:** `apps/mobile/scripts/generate-wasm-bridge.js`
**Run:** `node scripts/generate-wasm-bridge.js` (run once, commit output)

What it does:
1. Reads `frontend/public/wasm/mkaguzi_wasm.js` (58 KB ES module)
2. Reads `frontend/public/wasm/mkaguzi_wasm.wasm` → base64 string (~208 KB)
3. Generates `src/lib/game/wasm-bridge-html.ts`

The generated HTML (`BRIDGE_HTML`) does:
```
① base64 decode WASM binary → ArrayBuffer
② create Blob URL from inlined mkaguzi_wasm.js
   (Blob URL gives import.meta.url a valid value so Emscripten is happy;
    the wasmBinary option bypasses the fetch path that uses import.meta.url)
③ await import(blobUrl) → get Emscripten factory
④ const mkaguzi = await factory({ wasmBinary })
⑤ mkaguzi.ccall("mkz_init", null, [], [])
⑥ copy FEN conversion: appFenToMkaguziFen() from wasm-bridge.ts (symmetric swap)
⑦ implement handlers matching wasm-bridge.ts ccall signatures:
   - generateMoves(fen) → mkz_generate_moves → RawMove[]
   - applyMove(fen, from, to) → mkz_apply_move → new FEN string
   - search(fen, history, timeMs, depth, level, randomness) → mkz_search → RawSearchResult|null
   - gameResult(fen, fiftyMoves, threeKings, endgame) → mkz_game_result → RawGameResult
⑧ document.addEventListener("message", handler)   // Android
   window.addEventListener("message", handler)     // iOS
⑨ ReactNativeWebView.postMessage({ type: "ready" })
```

---

### Step 2 — Bridge manager: `mkaguzi-mobile.ts`

**File:** `apps/mobile/src/lib/game/mkaguzi-mobile.ts`

Exports:
- `MkaguziProvider` — renders the hidden `<WebView>`, manages a pending-promise map
- `useMkaguzi()` — returns `{ isReady, generateMoves, applyMove, search, gameResult }`

Hidden WebView mount:
```tsx
<WebView
  ref={webViewRef}
  source={{ html: BRIDGE_HTML }}
  onMessage={handleMessage}
  style={StyleSheet.absoluteFill}  // covered by app content, not visible
  javaScriptEnabled
  originWhitelist={["*"]}
/>
```
Positioned behind the app UI using a `zIndex` of `-1` on Android (opacity:0 has GPU cost).

Promise map pattern:
```typescript
const pending = new Map<string, { resolve, reject }>();

function send(type, payload): Promise<Result> {
  const id = uuid();
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    webViewRef.current?.postMessage(JSON.stringify({ id, type, payload }));
    setTimeout(() => { pending.get(id)?.reject(new Error("timeout")); pending.delete(id); }, 15_000);
  });
}

function handleMessage({ nativeEvent }) {
  const msg = JSON.parse(nativeEvent.data);
  if (msg.type === "ready") { setIsReady(true); return; }
  const cb = pending.get(msg.id);
  if (cb) { cb.resolve(msg.result); pending.delete(msg.id); }
}
```

Mounted in `_layout.tsx`:
```tsx
<MkaguziProvider>
  {/* existing app tree */}
</MkaguziProvider>
```

---

### Step 3 — AI search: `ai-search.ts`

**File:** `apps/mobile/src/lib/game/ai-search.ts`

Exact copy of web's `LEVEL_PARAMS` table (levels 1–19):

| Level | timeMs | level | randomness | blunderChance |
|---|---|---|---|---|
| 1 | 150 ms | 15 | 250 | 70% |
| 2 | 200 ms | 15 | 125 | 40% |
| 3 | 350 ms | 15 | 75 | 15% |
| 4 | 500 ms | 16 | 40 | 5% |
| 5 | 750 ms | 16 | 25 | 0% |
| 6–10 | 1000–3000 ms | 16–18 | decreasing | 0% |
| 11–19 | 3500–9000 ms | 18–19 | 0 | 0% |

`getBestMove(fen, player, level, fenHistory)`:
1. If `blunderChance > 0` and `Math.random() < blunderChance`:
   - `bridge.generateMoves(fen)` → pick a random legal move
2. Otherwise: `bridge.search(fen, fenHistory, timeMs, depth, level, randomness)`
3. Reconstruct `Move` object from `RawSearchResult` using `@tzdraft/mkaguzi-engine` pure-TS types

---

### Step 4 — Bot progression: `bot-progression.ts`

**File:** `apps/mobile/src/lib/game/bot-progression.ts`

Storage key: `"tzdraft-bot-progress"` in `AsyncStorage`
Value shape: `{ completedLevels: number[] }`

```typescript
isLevelUnlocked(level, user):
  baseMax = user?.accountType === "REGISTERED" ? 19 : 5
  if level <= baseMax → true
  if level <= maxCompletedLevel + 1 → true  (beat to unlock)
  → false

markLevelCompleted(level):
  load existing → add level → save

getNextUnlock(level):
  returns level + 1 if it exists and was just unlocked (for "unlocked!" banner)
```

---

### Step 5 — Game hook: `useAiGame.ts`

**File:** `apps/mobile/src/hooks/useAiGame.ts`

**Params:** `{ botLevel, playerColor: "WHITE"|"BLACK"|"RANDOM", timeSeconds }`

**State:**
```typescript
{
  fen: string                   // current position (app convention)
  board: BoardState             // pure-TS reconstruction for rendering
  currentPlayer: PlayerColor
  legalMoves: RawMove[]         // for the current player
  selectedSquare: number | null // PDN 1-32
  validDestinations: number[]   // PDN squares the selected piece can go to
  moves: RawMove[]              // full move history
  fenHistory: string[]          // for repetition detection in search
  result: GameResult | null
  isAiThinking: boolean
  timeLeft: { WHITE: number; BLACK: number }  // seconds
  reversibleMoveCount: number   // for 30-move rule
}
```

**Game loop:**

```
init:
  resolve player color (flip coin if RANDOM)
  fen = "W:W1,2,3,4,5,6,7,8,9,10,11,12:B21,22,23,24,25,26,27,28,29,30,31,32"
  bridge.generateMoves(fen) → legalMoves
  if AI plays WHITE → triggerAiMove()

selectSquare(pdn):
  if currentPlayer is human:
    if own piece has legal moves → set selectedSquare, filter validDestinations
    elif pdn in validDestinations → submitMove(matching RawMove)
    else → deselect

submitMove(rawMove):
  bridge.applyMove(fen, from, to) → newFen
  fenHistory.push(newFen)
  bridge.gameResult(newFen, reversibleMoveCount, ...) → result
  if result → setResult(result); markLevelCompletedIfWon()
  else:
    update fen, board = BoardState.fromFen(newFen)
    flip currentPlayer
    bridge.generateMoves(newFen) → legalMoves
    if AI's turn → triggerAiMove()

triggerAiMove():
  isAiThinking = true
  await aiSearch.getBestMove(fen, currentPlayer, botLevel, fenHistory)
  submitMove(bestMove)
  isAiThinking = false

timer (when timeSeconds > 0):
  setInterval every 1s → decrement timeLeft[currentPlayer]
  on zero → setResult({ winner: opponent, reason: "time" })
```

Multi-capture: when `legalMoves` includes multiple captures from the same source square,
`validDestinations` shows only the mandatory continuation paths — board is locked until
the full capture chain is resolved.

---

### Step 6 — Board component: `DraughtsBoard.tsx` + `Piece.tsx`

**File:** `apps/mobile/src/components/game/DraughtsBoard.tsx`

**PDN mapping (TZD orientation — WHITE at bottom):**
```
Row 0 (top, BLACK's back rank):  PDN 29, 30, 31, 32
Row 1:                            PDN 25, 26, 27, 28
...
Row 7 (bottom, WHITE's back):    PDN 1,  2,  3,  4
```

Dark squares only are interactive (32 squares total).
Each square is `(boardWidth / 8)` × `(boardWidth / 8)` — board fills ~92 vw, centered.

**Props:**
```typescript
interface DraughtsBoardProps {
  board: BoardState
  highlights: Record<number, "selected" | "destination" | "capturable">
  onSquarePress: (pdn: number) => void
  flipped?: boolean   // future: flip for BLACK player perspective
  disabled?: boolean  // during AI thinking or after game end
}
```

**Highlight rendering:**
- `selected` → orange ring on piece (`borderWidth: 3, borderColor: colors.primary`)
- `destination` → small dot (`8×8` circle, `colors.primary`) in center of empty square
- `capturable` → red shadow/tint on opponent piece
- No animations in v1 (instant position update); Reanimated 2 transitions in Phase 3

**File:** `apps/mobile/src/components/game/Piece.tsx`

- Circle `View`: white pieces `#f0ebe0`, black pieces `#1a1505`, border for contrast
- King indicator: smaller concentric inner ring (`width: 60%`, `borderColor`)
- Size: fills the parent square with 8 px padding

---

### Step 7 — Game screen: `vs-ai.tsx`

**File:** `apps/mobile/app/game/vs-ai.tsx`

**Route params:** `botLevel: number`, `playerColor: "WHITE"|"BLACK"|"RANDOM"`, `timeSeconds: number`

**Layout:**
```
<SafeAreaView>
  <TopBar>
    ArrowLeft (confirm resign modal if game active) | bot-avatar + name + elo + tier | ⚑ resign
  </TopBar>

  <BotRow>
    avatar | name | tier badge |
    "thinking…" animated dots (visible when isAiThinking) |
    captured pieces row | timer (if timeSeconds > 0)
  </BotRow>

  <DraughtsBoard />    ← flex 1, centered

  <PlayerRow>
    timer (if timeSeconds > 0) | captured pieces row | username | color chip (W/B)
  </PlayerRow>

  <ResultModal animationType="fade">
    icon: Trophy (win) | X (loss) | Minus (draw)
    headline: "You beat Tau!" / "{botName} wins" / "Draw"
    sub: "Level {N} complete" (on win) + "Next bot unlocked!" banner if new unlock
    buttons: [Rematch] [Back to Setup]
  </ResultModal>

  <ResignConfirmModal>
    "Resign this game?" [Cancel] [Resign]
  </ResignConfirmModal>
</SafeAreaView>
```

**On win:** call `botProgression.markLevelCompleted(botLevel)` before showing result modal.
If a new level was unlocked, show "🏆 Level {N+1} Unlocked!" banner in the modal.

---

### Step 8 — Wire setup-ai and layout

**`setup-ai.tsx` — `handleStartGame`:**
```typescript
const handleStartGame = () => {
  router.push(
    `/game/vs-ai?botLevel=${selectedBot.level}&playerColor=${selectedColor}&timeSeconds=${selectedTime * 60}`
  );
};
```

**`_layout.tsx`:**
```tsx
import { MkaguziProvider } from "../src/lib/game/mkaguzi-mobile";

// Wrap Stack in provider:
<MkaguziProvider>
  <Stack ...>
    ...existing screens...
    <Stack.Screen name="game/vs-ai" options={{ headerShown: false }} />
  </Stack>
</MkaguziProvider>
```

---

## Level access rules

| User type | Default access | Beat-to-unlock |
|---|---|---|
| Guest | Levels 1–5 | Can unlock 6–19 by beating each level |
| Registered | Levels 1–19 | All available immediately |

Stored in `AsyncStorage` key `"tzdraft-bot-progress"` — survives logout (progress is local,
not tied to account; syncing to backend is a Phase 3 item).

---

## What works offline (full offline capability)

| Feature | Mechanism |
|---|---|
| All 19 AI levels | Mkaguzi C++ search inside WebView |
| Legal move generation | Mkaguzi via WebView bridge |
| Game result detection (win/stalemate/draw) | Mkaguzi via WebView bridge |
| TZD draw rules (30-move, repetition, endgame countdown) | `wasmGameResult` with counters |
| Board state rendering | `BoardState.fromFen()` — pure TypeScript |
| Bot unlock progression | `AsyncStorage` |
| Game timer | `setInterval` |

---

## Implementation order

| # | Task | Depends on |
|---|---|---|
| 1 | Run `generate-wasm-bridge.js` → commit `wasm-bridge-html.ts` | nothing |
| 2 | `mkaguzi-mobile.ts` + wire into `_layout.tsx` | step 1 |
| 3 | Smoke-test bridge (log `isReady`, call `generateMoves` on initial FEN) | step 2 |
| 4 | `ai-search.ts` | step 2 |
| 5 | `bot-progression.ts` | nothing |
| 6 | `Piece.tsx` + `DraughtsBoard.tsx` | nothing |
| 7 | `useAiGame.ts` | steps 2, 4, 5, 6 |
| 8 | `vs-ai.tsx` | step 7 |
| 9 | Wire `setup-ai.tsx` navigation | step 8 |
| 10 | Manual QA: all 19 levels, both colors, time controls | all |

---

## Out of scope for Phase 2

| Item | Phase |
|---|---|
| Saving completed games to backend history | Phase 3 (fire-and-forget POST after game) |
| Online matchmaking (lobby WebSocket) | Phase 3 |
| Play vs Friend end-to-end | Phase 3 |
| Reanimated piece movement animations | Phase 3 |
| Bot progression synced to account | Phase 3 |
| Profile editing | Phase 2 stretch goal |
| Settings screen content | Phase 2 stretch goal |

---

## Files to create / modify (summary)

| Action | File |
|---|---|
| create | `apps/mobile/scripts/generate-wasm-bridge.js` |
| create (generated) | `apps/mobile/src/lib/game/wasm-bridge-html.ts` |
| create | `apps/mobile/src/lib/game/mkaguzi-mobile.ts` |
| create | `apps/mobile/src/lib/game/ai-search.ts` |
| create | `apps/mobile/src/lib/game/bot-progression.ts` |
| create | `apps/mobile/src/hooks/useAiGame.ts` |
| create | `apps/mobile/src/components/game/DraughtsBoard.tsx` |
| create | `apps/mobile/src/components/game/Piece.tsx` |
| create | `apps/mobile/app/game/vs-ai.tsx` |
| modify | `apps/mobile/app/game/setup-ai.tsx` |
| modify | `apps/mobile/app/_layout.tsx` |
