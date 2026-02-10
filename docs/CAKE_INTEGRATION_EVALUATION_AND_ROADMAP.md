# 🚀 CAKE Engine Integration — Implementation Evaluation & Roadmap

**Date:** 2026-02-10  
**Status:** Pre-Implementation Analysis  
**Confidence:** HIGH (plan is sound; execution is straightforward)

---

## ✅ Plan Evaluation: Strengths

### 1. **Architecture Alignment (EXCELLENT)**

Your DDD structure **already supports this perfectly**:

| Layer          | CAKE Fit                                    |
| -------------- | ------------------------------------------- |
| **Domain**     | CAKE **is** pure domain logic               |
| **Backend**    | Validation + server AI                      |
| **Frontend**   | Local AI + UI coordination                  |
| **No Coupling**| Framework-agnostic package design           |

**Verdict:** No redesign needed. CAKE as a shared package is THE correct pattern.

---

### 2. **Rule Parity (CRITICAL & SOLVED)**

The plan eliminates the biggest AI integration risk:

❌ **Bad:** Rewrite move validation in browser; drift emerges  
✅ **Good:** One CAKE engine; both runtimes execute identical logic

This is how chess.com does it (Stockfish as shared lib).

---

### 3. **Offline-First (FUTURE-PROOF)**

Local games:
* Run instantly (no latency)
* Need no auth (good UX for exploration)
* Cost zero in servers
* Can later be persisted/replayed

Perfect for:
* Casual practice
* Skill building
* Leaderboard-less games
* Accessibility

---

### 4. **Clean Isolation (PREVENTS BUGS)**

Local games **never touch**:
* Database
* WebSockets
* Auth session
* Rating system

Hard boundary prevents:
* Accidental data leaks
* Session bugs
* elo calc errors
* Sync race conditions

---

## ⚠️ Critical Implementation Decisions

### **Decision 1: Monorepo vs. Published Package**

| Approach         | Pros                      | Cons                    |
| ---------------- | ------------------------- | ----------------------- |
| **Monorepo**     | Simple, local dev         | Need workspaces setup   |
| **Published npm**| Clean boundaries          | CI/CD overhead          |
| **Git submodule**| Versioned, reusable       | Complex git workflow    |

**RECOMMENDATION:** Start with **monorepo** (`packages/cake-engine/`).

Later, if you build CLI tools or other clients, publish to npm.

---

### **Decision 2: Browser Compatibility**

CAKE must work in browser (no Node.js-only APIs):

❌ **Forbidden:**
```ts
import fs from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
```

✅ **Allowed:**
```ts
const board = serializedBoard;  // JSON
const moves = generateMoves(board);  // Pure functions
```

**Action:** Audit existing CAKE code for Node-only imports.

---

### **Decision 3: Move Serialization Format**

Frontend ↔ Backend must agree on move JSON:

```ts
// ✅ CLEAN (matches DB notation)
{ from: 22, to: 17, captures: [19] }

// ✅ ALSO GOOD (preserves semantics)
{ from: 22, to: 17, path: [22, 19, 17], captures: [19] }

// ❌ AVOID (loses information)
{ notation: "22-17" }
```

**Action:** Define `MoveDTO` in shared package.

---

### **Decision 4: AI Depth vs. Performance**

Browser minimax depth is limited:

| Depth | Move Time | Quality            |
| ----- | --------- | ------------------ |
| 4     | <100ms    | Beginner-friendly  |
| 6     | 200–500ms | Intermediate       |
| 8     | 1–2s      | Advanced (risky)   |

**Recommendation:**

* Level 1–2: Depth 1 (random)
* Level 3–5: Depth 4–5 (heuristic + shallow search)
* Level 6–7: **Depth 6 max** (with move ordering)

Use **transposition table** + **alpha-beta pruning** to stay responsive.

---

## 🔴 Implementation Risks & Mitigations

### Risk 1: **CAKE Has Dependencies**

**Scenario:** Current CAKE uses graphql / lodash / heavy libs

**Mitigation:**
1. Audit `packages/cake-engine/package.json`
2. Remove all non-essential deps
3. Rewrite or inline if needed
4. Keep < 100KB gzipped

**Action:** Create `packages/cake-engine/BROWSER_COMPAT.md`

---

### Risk 2: **Move Validation Divergence**

**Scenario:** Frontend game shows move as legal, backend rejects

**Mitigation:**
* Write **shared test suite** in CAKE package
* Same tests run in both Node.js (backend test) + JSDOM (frontend test)
* CI fails if results differ

**Action:** Create `cake-engine/test/rules.test.ts` with 50+ rule cases.

---

### Risk 3: **AI Moves Feel Dumb**

**Scenario:** Bot ignores tempting captures, makes random moves

**Mitigation:**
* Use **piece-square tables** (endgame vs opening strategies)
* Evaluate captures first (always find forcing moves)
* Test AI against itself at each level

**Action:** Implement evaluation function that **prioritizes captures**.

---

### Risk 4: **Slow Move Generation in Browser**

**Scenario:** `generateLegalMoves()` takes 500ms per turn

**Mitigation:**
* Cache board position hash → move list
* Pre-generate captures before non-captures
* Use bitboard representation (if applicable to 32-square board)

**Action:** Benchmark `generateLegalMoves()` with 1000 random positions.

---

## 📋 Phased Implementation Roadmap

### **Phase 0: Preparation (2–3 days)**

**Goal:** Validate CAKE code is browser-compatible

#### Tasks

1. **Audit CAKE**
   - [ ] Review `backend/src/domain/game/` for browser-unsafe imports
   - [ ] List all dependencies
   - [ ] Identify "pure domain" code vs "framework-specific"

2. **Extract to Shared Package Structure**
   - [ ] Create `packages/cake-engine/` directory
   - [ ] Move CAKE code
   - [ ] Add minimal `package.json` (no backend deps)

3. **Write Browser Compat Checklist**
   - [ ] No `fs`, `path`, `child_process`
   - [ ] No NestJS imports
   - [ ] No Prisma imports
   - [ ] TypeScript compiles for browser targets

**Deliverable:** Buildable CAKE package, zero warnings.

---

### **Phase 1: Core Engine (1 week)**

**Goal:** CAKE works in browser with full test coverage

#### Tasks

1. **Define Public API**
   - [ ] Create `engine.ts` with 5 core functions:
     ```ts
     createInitialState()
     generateLegalMoves(state, player)
     applyMove(state, move)
     evaluateGameResult(state)
     isLockState(state)  // Handle lock (no legal moves)
     ```

2. **Implement Move Serialization**
   - [ ] Define `Move` type (from, to, captures[])
   - [ ] Define `BoardState` type (pieces, turn, moveCount)
   - [ ] Add `move.equals()` and `state.serialize()` methods

3. **Write Shared Test Suite**
   - [ ] 50+ test cases covering:
     - Single moves
     - Multi-capture chains
     - Forced captures
     - Promotion rules
     - Win/draw detection
     - Edge cases (e.g., captures to edge)

4. **Build for Browser**
   - [ ] Add `tsconfig.json` (es2020, browser target)
   - [ ] Test import in Next.js: `import { CakeEngine } from '@cake/engine'`
   - [ ] Verify bundle size < 50KB (uncompressed)

**Deliverable:** `npm run test` passes; CAKE usable in Next.js.

---

### **Phase 2: Frontend Integration (1 week)**

**Goal:** Local game mode fully functional

#### Tasks

1. **Create `useLocalGame` Hook**
   - [ ] Manage game state (board, turn, moves history)
   - [ ] Validate user moves with CAKE
   - [ ] Trigger AI move
   - [ ] Detect game end

2. **Build AI Bot**
   - [ ] Implement evaluation function (piece value, position safety, captures)
   - [ ] Minimax with alpha-beta pruning (depth 4–6)
   - [ ] Move ordering (captures first)
   - [ ] Difficulty scaling (1–7 levels)

3. **Create Local Game Page**
   - **Route:** `localhost:3000/[locale]/game/local`
   - **Query Params:** `?level=3&color=WHITE&time=300`
   - [ ] Difficulty selector
   - [ ] Color selector
   - [ ] Time control selector (optional for Phase 1)
   - [ ] Board display (reuse existing component)
   - [ ] Move input (click/drag)
   - [ ] AI move animation
   - [ ] Game over modal

4. **Test E2E**
   - [ ] Play vs AI (all levels)
   - [ ] Verify rules enforced
   - [ ] Check AI move quality (not random)
   - [ ] Verify offline (disable network, play works)

**Deliverable:** Playable local game at `/game/local`

---

### **Phase 3: Backend Parity (3–4 days)**

**Goal:** Backend uses CAKE for server-side AI and move validation

#### Tasks

1. **Create Backend AI Module**
   - [ ] Inject CAKE engine into NestJS module
   - [ ] Create `AiMoveUseCase` that calls `bot.getBestMove()`

2. **Replace Manual Validation**
   - [ ] Update `MoveValidationService` to use CAKE
   - [ ] Update `GameRulesService` to use CAKE

3. **Test Parity**
   - [ ] Run same test suite in backend Jest
   - [ ] Verify identical results: frontend CAKE ≡ backend CAKE

4. **Integration Test**
   - [ ] Create game via API
   - [ ] Play human move
   - [ ] Request AI move
   - [ ] Verify move from CAKE backend passed to frontend

**Deliverable:** Server-side AI uses same CAKE engine.

---

### **Phase 4: Polish & Optimization (3–5 days)**

**Goal:** Production-ready local games

#### Tasks

1. **Performance**
   - [ ] Profile AI move time (target < 500ms for level 5)
   - [ ] Cache move lists for repeated positions
   - [ ] Optimize piece value tables

2. **UX**
   - [ ] Show "AI is thinking..." while move generates
   - [ ] Highlight legal moves on click
   - [ ] Show captured pieces
   - [ ] Log moves in algebraic notation
   - [ ] "Undo last move" option (local only)

3. **Edge Cases**
   - [ ] Handle stalemate (allowed in Tanzanian Drafti?)
   - [ ] Handle draw by repetition (3x same position)
   - [ ] Handle draw by 50-move rule (if applicable)

4. **Accessibility**
   - [ ] Keyboard navigation (arrow keys to move)
   - [ ] Screen reader support

**Deliverable:** Polished, fast, accessible local game.

---

## 🗂️ File Structure (Concrete)

After full implementation:

```
TzDraft/
├── packages/
│   └── cake-engine/
│       ├── src/
│       │   ├── board.ts                   # BoardState, square mapping
│       │   ├── move.ts                    # Move type, serialization
│       │   ├── pieces.ts                  # Piece, Position VOs
│       │   ├── evaluation.ts              # Heuristic evaluation
│       │   ├── move-generator.ts          # Generate legal moves
│       │   ├── capture-finder.ts          # Find captures
│       │   ├── move-validator.ts          # Validate moves
│       │   ├── game-rules.ts              # Win/draw/promotion
│       │   ├── engine.ts                  # Public API
│       │   └── index.ts
│       ├── test/
│       │   ├── rules.test.ts              # 50+ test cases
│       │   ├── ai.test.ts                 # AI behavior tests
│       │   └── fixtures.ts                # Test positions
│       ├── package.json
│       ├── tsconfig.json
│       ├── BROWSER_COMPAT.md
│       └── README.md
│
├── backend/
│   └── src/
│       ├── domain/
│       │   └── game/
│       │       ├── services/
│       │       │   ├── move-validation.service.ts   # Uses CAKE
│       │       │   ├── game-rules.service.ts        # Uses CAKE
│       │       │   ├── move-generator.service.ts    # Uses CAKE
│       │       │   └── ai-move.use-case.ts          # NEW: AI for server
│       │       └── ...
│       └── ...
│
├── frontend/
│   └── src/
│       ├── hooks/
│       │   └── useLocalGame.ts             # NEW: Local game state
│       ├── lib/
│       │   └── ai/
│       │       └── bot.ts                  # NEW: Difficulty levels
│       ├── app/
│       │   └── [locale]/
│       │       └── game/
│       │           ├── local/
│       │           │   └── page.tsx        # NEW: Local game page
│       │           └── ...
│       └── ...
│
└── docs/
    ├── CAKE_INTEGRATION_EVALUATION_AND_ROADMAP.md  # (THIS FILE)
    ├── CAKE_ENGINE_INTEGRATION_PLAN.md
    └── ...
```

---

## 📊 Effort Estimate

| Phase | Duration       | Key Risk       |
| ----- | -------------- | -------------- |
| 0     | 2–3 days       | Code audit     |
| 1     | 1 week         | Test coverage  |
| 2     | 1 week         | AI performance |
| 3     | 3–4 days       | Integration    |
| 4     | 3–5 days       | Polish         |
| **Total** | **4–5 weeks** | **Manageable** |

If you have solid CAKE code already, **Phase 0–1 can compress to 4–5 days**.

---

## 🎯 How I Will Implement (Concrete Steps)

### **Step 1: Code Audit & Package Setup** (Day 1)

```bash
# I will:
1. Read all files in backend/src/domain/game/
2. Check for backend-only imports (NestJS, Prisma, Socket.IO)
3. Create packages/cake-engine/ structure
4. Move pure domain code
5. Create minimal package.json (no deps initially)
6. Verify TypeScript compiles
```

**Deliverable to you:** `packages/cake-engine/` ready for tests.

---

### **Step 2: API Definition & Test Suite** (Days 2–3)

```ts
// In cake-engine/src/engine.ts
export interface CakeEngine {
  createInitialState(): BoardState;
  generateLegalMoves(state: BoardState, player: PlayerColor): Move[];
  applyMove(state: BoardState, move: Move): BoardState;
  evaluateGameResult(state: BoardState): GameResult | null;
}
```

**I will write 50+ test cases covering:**
- Corner cases (promotion, blocks, captures to edge)
- Rule enforcement (forced capture)
- Draw/win detection

**Deliverable to you:** Green test suite, API frozen.

---

### **Step 3: Frontend Hook** (Days 4–5)

```ts
// frontend/src/hooks/useLocalGame.ts

export function useLocalGame(aiLevel: number, userColor: PlayerColor) {
  const [state, setState] = useState(engine.createInitialState());
  const [turn, setTurn] = useState<PlayerColor>('WHITE');

  const makeMove = (move: Move) => {
    const legal = engine.generateLegalMoves(state, turn);
    if (!legal.find(m => m.equals(move))) return; // Invalid

    const next = engine.applyMove(state, move);
    setState(next);

    if (turn !== userColor) {
      // AI just moved, user's turn next
      setTurn(userColor);
    } else {
      // User just moved, AI's turn
      setTimeout(() => {
        const aiMove = bot.getBestMove(next, aiLevel, opponent(turn));
        const afterAi = engine.applyMove(next, aiMove);
        setState(afterAi);
        setTurn(userColor); // Back to user
      }, 300);
    }
  };

  return { state, makeMove, gameOver: engine.evaluateGameResult(state) };
}
```

**Deliverable to you:** Fully functional hook, zero server calls.

---

### **Step 4: Local Game Page** (Days 6–7)

```tsx
// frontend/src/app/[locale]/game/local/page.tsx

'use client';

import { useLocalGame } from '@/hooks/useLocalGame';
import { useSearchParams } from 'next/navigation';

export default function LocalGamePage() {
  const params = useSearchParams();
  const level = parseInt(params.get('level') ?? '3');
  const color = (params.get('color') ?? 'WHITE') as PlayerColor;

  const { state, makeMove, gameOver } = useLocalGame(level, color);

  return (
    <div>
      <Board state={state} onSquareClick={(sq) => {
        // Handle move selection
      }} />
      {gameOver && <GameOver result={gameOver} />}
    </div>
  );
}
```

**Deliverable to you:** Playable game at `/game/local?level=3&color=WHITE`.

---

### **Step 5: Backend Integration** (Days 8–9)

```ts
// backend/src/application/use-cases/ai-move.use-case.ts

@Injectable()
export class AiMoveUseCase {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly bot: AiBot, // Uses CAKE
  ) {}

  execute(gameId: string, aiLevel: number): Promise<Move> {
    const game = await this.gameRepository.findById(gameId);
    const state = this.reconstructState(game.moves);
    const move = this.bot.getBestMove(state, aiLevel, game.currentTurn);
    return move;
  }
}
```

**Deliverable to you:** Server AI working, test parity confirmed.

---

## ✅ Quality Assurance Checklist

Before "done", verify:

- [ ] `npm run test` in `packages/cake-engine/` passes 50+ tests
- [ ] Frontend game offline: disable network, game still works
- [ ] AI move from frontend ≡ AI move from backend (same position, same level)
- [ ] Bundle size: `cake-engine` + `useLocalGame` < 80KB gzip
- [ ] All 7 difficulty levels feel reasonable
- [ ] Move validation matches backend exactly (cross-tested)
- [ ] Stalemate/draw/promotion handled identically
- [ ] No console errors; no TypeScript errors

---

## 🚀 Next Action

**Choice:**

### Option A: Start Phase 0 Now
I can immediately:
1. Audit your CAKE code
2. Set up `packages/cake-engine/`
3. Identify any browser incompatibilities
4. Give you a concrete "ready for development" snapshot

**Time: 2–3 hours**

### Option B: Deep Dive on AI Heuristics
Before Phase 0, I can design the evaluation function for Tanzanian Drafti:
- Piece value tables
- Position safety scoring
- Endgame vs opening strategy
- Difficulty scaling algorithm

**Time: 1–2 hours**

### Option C: Frontend Integration Specifics
I can write the full `useLocalGame` hook + local game page immediately, ready to integrate once CAKE is extracted.

**Time: 3–4 hours**

---

## Summary & Verdict

**This plan is EXCELLENT.** It's:

✅ Architecturally sound  
✅ Prevents drift (one engine, two runtimes)  
✅ Future-extensible (offline → saveable → replayable)  
✅ Professional (matches chess.com / lichess patterns)  
✅ Achievable (4–5 weeks, no surprises)  

I'm ready to implement **Phase 0–1 immediately** if you approve.

**What's my next move?**

