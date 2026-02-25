# Kallisto Engine Integration

Replace/complement SiDra with **Kallisto_4.dll** as the primary strong AI engine. CAKE remains the browser-side move validation engine. SiDra stays as the "medium" difficulty engine. Kallisto becomes the "advanced" difficulty engine.

> [!IMPORTANT]
> **Key discovery:** SiDra is also by Igor Korshunov (same author as Kallisto). Both use the identical `EI_*` CheckerBoard DLL export API. The integration pattern for Kallisto is identical to SiDra, with one key difference: Kallisto needs a **TZD rule patch** since it implements Russian draughts (men can capture backward; promotion-during-capture continues as king) while TZD forbids both.

## Proposed Changes

### Component 1 — Kallisto CLI Shim (C++)

The existing sidra-cli pattern uses a compiled [.exe](file:///c:/Users/Admin/Desktop/TzDraft/engines/sidra/cli/sidra-cli.exe) that loads the DLL via `LoadLibrary`, bridges the `EI_*` API, and communicates with Node.js via **stdin/stdout line protocol**.

#### [NEW] `engines/kallisto/kallisto-cli.cpp`
- Copy and adapt [engines/sidra/cli/sidra-cli.cpp](file:///c:/Users/Admin/Desktop/TzDraft/engines/sidra/cli/sidra-cli.cpp) 
- Target: Kallisto_4.dll instead of SiDra DLL
- Commands over stdin: `newgame`, `setboard <pos>`, `settime <ms>`, `think`, `stop`, `quit`
- Outputs over stdout: `bestmove <move>`, `info depth <d> score <s> pv <line>`
- Same line protocol already proven with SiDra

#### [NEW] `engines/kallisto/Kallisto_4.dll`
- Copy from [docs/kallisto/Kallisto_4.dll](file:///c:/Users/Admin/Desktop/TzDraft/docs/kallisto/Kallisto_4.dll)

#### [NEW] `engines/kallisto/build_kallisto_cli.bat`
- Build script for `kallisto-cli.exe` (mirrors [build_cli.bat](file:///c:/Users/Admin/Desktop/TzDraft/engines/sidra/cli/build_cli.bat) in sidra/cli)

---

### Component 2 — Backend Engine Adapter Layer (NestJS)

#### [NEW] `backend/src/infrastructure/engine/engine.interface.ts`
```typescript
export interface IEngineAdapter {
  newGame(): Promise<void>;
  setPosition(fenLike: string): Promise<void>;
  setTimeControl(totalMs: number, incrementMs: number): Promise<void>;
  getBestMove(timeLimitMs: number): Promise<string>; // returns algebraic e.g. "a3-b4"
  stop(): void;
  dispose(): void;
}
```

#### [NEW] `backend/src/infrastructure/engine/kallisto.adapter.ts`
- Spawns `kallisto-cli.exe` as a child process (persistent)
- Sends commands via `proc.stdin.write()`
- Resolves `getBestMove()` when `bestmove` line arrives on stdout
- **Applies TZD rule patch** (see Component 3) to filter illegal moves before returning

#### [NEW] `backend/src/infrastructure/engine/sidra.adapter.ts`
- Identical structure but targets [sidra-cli.exe](file:///c:/Users/Admin/Desktop/TzDraft/engines/sidra/cli/sidra-cli.exe)
- No TZD patch needed (SiDra was already patched in Generator.cpp)

#### [NEW] `backend/src/infrastructure/engine/engine.module.ts`
- Provides `KallistoAdapter` and `SidraAdapter`
- Configures EGTB path for Kallisto: `docs/kallisto/kallisto-game-db`

---

### Component 3 — TZD Rule Patch (TypeScript filter)

#### [NEW] `backend/src/infrastructure/engine/tzd-rule-patch.ts`
Two filters applied to Kallisto's output before it's returned:

1. **Backward capture filter for men**: Parse the move string, replay it against current board state using CAKE (already available as `@tzdraft/cake-engine`), reject any move variant where a man captures on a backward diagonal.

2. **Mid-capture promotion stop**: If Kallisto returns a sequence where a man reaches the back rank and continues capturing, truncate the sequence at the promotion square.

```typescript
export function applyTzdPatch(
  rawMove: string,      // e.g. "c3:e5:c7:a5" from Kallisto
  board: BoardState,    // current board from CAKE
  player: PlayerColor,
): string              // patched (possibly truncated) move
```

---

### Component 4 — AI Game Mode Wiring

#### [MODIFY] `backend/src/domain/game/entities/game.entity.ts` (or equivalent)
- Add `aiLevel: 'CAKE' | 'SIDRA' | 'KALLISTO'` field (default: `'CAKE'`)

#### [MODIFY] AI game use-case / GameGateway
- When AI is to move, dispatch to correct adapter based on `aiLevel`:
  - `CAKE` → existing frontend-side random/simple logic  
  - `SIDRA` → `SidraAdapter.getBestMove()`
  - `KALLISTO` → `KallistoAdapter.getBestMove()`

---

### Component 5 — EGTB Configuration

#### [MODIFY] `kallisto.adapter.ts`
- On startup, send EGTB path to Kallisto via `EI_EGDB` equivalent CLI command
- Point to: `c:\Users\Admin\Desktop\TzDraft\docs\kallisto\kallisto-game-db`

---

## Verification Plan

### Automated Tests

**1. Existing CAKE test suite (unchanged regression check):**
```bash
cd c:\Users\Admin\Desktop\TzDraft\packages\cake-engine
pnpm test
```
All 30+ existing tests must pass.

**2. New TZD patch unit tests** (`backend/src/infrastructure/engine/tzd-rule-patch.spec.ts`):
- Test: man at c5 with black piece at d6 — backward capture `c5:e3` must be filtered out
- Test: man reaches back rank mid-sequence — sequence must be truncated at promotion square
- Test: a legal pure-forward capture passes through unchanged

**3. Kallisto smoke test** (integration, run after build):
```bash
cd c:\Users\Admin\Desktop\TzDraft\engines\kallisto
.\kallisto-cli.exe
# Paste: newgame
# Paste: setboard bbbbbbbbbbbb........wwwwwwwwwwwww (starting position)
# Paste: think
# Expect: bestmove <some valid move like c3-d4>
```

### Manual Verification

1. Start backend: `cd backend && pnpm run start:dev`
2. Start frontend: `cd frontend && pnpm run dev`
3. Navigate to "Play vs Computer"
4. Select difficulty **Advanced (Kallisto)**
5. Make a few moves — verify AI responds with legal TZD moves (no backward man captures)
6. Select difficulty **Medium (SiDra)**
7. Verify SiDra also responds with legal moves
8. Verify CAKE (Beginner) still works as before

> [!WARNING]
> Kallisto_4.dll targets **Russian draughts** natively. The TZD patch (Component 3) is critical. Without it, Kallisto may suggest moves that are illegal under TZD rules. If the patch logic is complex, we can initially deploy Kallisto in a read-only "analysis" mode and apply the patch iteratively.
