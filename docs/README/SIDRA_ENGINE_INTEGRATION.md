# Sidra Engine Integration Guide

**Last Updated:** 2026-02-16

## Overview

Sidra is a powerful C++ draughts engine integrated into TzDraft as an AI opponent. It provides intelligent move generation and game analysis for Tanzania Drafti (TZD) 8×8 draughts games.

## What is Sidra?

- **Original:** Igor Korshunov's SiDra engine (Russian draughts)
- **Current Use:** Adapted for Tanzania Drafti rules in TzDraft
- **Implementation:** Windows DLL with a CLI wrapper for easy integration
- **Skill Levels:** 7 progressive difficulty levels (Swala to Simba)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Next.js)                                          │
│ useSidraGame hook                                           │
└──────────┬──────────────────────────────────────────────────┘
           │ HTTP POST /engines/sidra/move
           │ SidraMoveRequest (board state, current player)
           ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (NestJS)                                            │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ SidraController                                      │   │
│ │ POST /engines/sidra/move                             │   │
│ └──────────────────────┬───────────────────────────────┘   │
│                        │                                    │
│ ┌──────────────────────▼───────────────────────────────┐   │
│ │ SidraEngineService                                   │   │
│ │ 1. Transform request to Sidra coordinates            │   │
│ │ 2. Spawn CLI subprocess                              │   │
│ │ 3. Parse JSON response                               │   │
│ │ 4. Validate against official engine                  │   │
│ │ 5. Normalize & return move                           │   │
│ └──────────────────────┬───────────────────────────────┘   │
│                        │                                    │
│ ┌──────────────────────▼───────────────────────────────┐   │
│ │ Coordinate Mapping (SidraBoardMapper)                │   │
│ │ • CAKE Engine (1-32, top-left)                       │   │
│ │ • Sidra Format (1-32, bottom-left)                   │   │
│ │ • Position transformation: pos' = 33 - pos           │   │
│ └──────────────────────┬───────────────────────────────┘   │
│                        │                                    │
│ ┌──────────────────────▼───────────────────────────────┐   │
│ │ OfficialEngine Validation                            │   │
│ │ • Check if Sidra move is legal per TZD rules         │   │
│ │ • Fallback to random legal move if invalid           │   │
│ │ • Enforce TZD rule compliance                        │   │
│ └──────────────────────┬───────────────────────────────┘   │
│                        │                                    │
│                        │ SidraMoveResponse (normalized)    │
└────────────────────────┼────────────────────────────────────┘
                         │
           ┌─────────────▼──────────────┐
           │                            │
           ▼                            ▼
    ┌─────────────────┐      ┌──────────────────┐
    │ SiDra.dll       │      │ sidra-cli.exe    │
    │ (C++)           │◄─────┤ (wrapper)        │
    │ • Move gen      │      │ • JSON I/O       │
    │ • Evaluation    │      │ • DLL interface  │
    │ • Think time    │      │ • stdout/stdin   │
    └─────────────────┘      └──────────────────┘
```

## Request-Response Flow

### 1. Frontend → Backend

**Endpoint:** `POST /engines/sidra/move`

**Request Format (SidraMoveRequest):**
```typescript
{
  pieces: [
    { type: 'MAN', color: 'WHITE', position: 9 },
    { type: 'MAN', color: 'WHITE', position: 10 },
    { type: 'KING', color: 'BLACK', position: 2 },
    // ... all pieces on board
  ],
  currentPlayer: 'BLACK',
  moveCount: 15,
  timeLimitMs: 5000  // Optional: thinking time
}
```

### 2. Backend Processing

#### Step 1: Coordinate Transformation
```typescript
// CAKE Engine position (top-left origin)
position = 9

// Transform to Sidra (bottom-left origin)
position' = 33 - 9 = 24
```

#### Step 2: CLI Execution
```bash
sidra-cli.exe
Input: JSON with transformed board state
Output: {"from": 24, "to": 20, "capturedSquares": [], "isPromotion": false}
```

#### Step 3: Response Parsing & Mapping Back
```typescript
// Sidra response
{ from: 24, to: 20 }

// Transform back to CAKE Engine coordinates
{ from: 9, to: 13 }

// Apply geometric capture inference if needed
// Extract captured squares
```

#### Step 4: TZD Rule Validation
```typescript
// Validate against OfficialEngine
const legalMoves = OfficialEngine.generateLegalMoves(board, currentPlayer);
const isLegalMove = legalMoves.some(m => 
  m.from === sidraMappedMove.from && 
  m.to === sidraMappedMove.to
);

// If invalid: fallback to random legal move
if (!isLegalMove) {
  return randomMove from legalMoves;
}
```

#### Step 5: Normalization & Return
```typescript
// Return normalized, validated move
{
  from: 9,
  to: 13,
  capturedSquares: [10],
  isPromotion: false,
  player: 'BLACK'
}
```

### 3. Backend → Frontend

**Response Format (SidraMoveResponse):**
```typescript
{
  from: 9,           // Zero-based square index
  to: 13,            // Zero-based square index
  capturedSquares: [10],  // Squares with opponent pieces
  isPromotion: true   // Man reached promotion square
}
```

## Coordinate System

### CAKE Engine (TzDraft Standard)
- **Origin:** Top-left (row 0, col 0)
- **Range:** 1–32
- **Layout:**
  ```
  Dark squares only (row + col = odd)
  1  2  3  4
  5  6  7  8
  9  10 11 12
  ...         32
  ```

### Sidra Format (Russian Draughts)
- **Origin:** Bottom-left (row 7, col 0)
- **Range:** 1–32
- **Transformation:** `sidra_pos = 33 - cake_pos`
- **Inverse:** `cake_pos = 33 - sidra_pos`

### Example Conversions
| CAKE | Sidra | Meaning |
|------|-------|---------|
| 1    | 32    | Top-left to bottom-right |
| 2    | 31    | Top-left adjacent |
| 9    | 24    | Row 2, col 0 |
| 32   | 1     | Bottom-right to top-left |

## Game Difficulty Levels

Sidra integrates with the TzDraft bot progression system:

| Level | Name | ELO | Danger | Description |
|-------|------|-----|--------|-------------|
| 1 | Swala | 500 | 1/7 | Gentle, makes frequent mistakes |
| 2 | Twiga | 800 | 2/7 | Basic tactics, spots obvious captures |
| 3 | Nyati | 1100 | 3/7 | Punishes blunders, plays with intent |
| 4 | Tembo | 1400 | 4/7 | Sets traps, strong capture sequences |
| 5 | Mamba | 1700 | 5/7 | Squeezes positions, converts advantages |
| 6 | Chui | 2000 | 6/7 | Ruthless tactics, fewer misses |
| 7 | Simba | 2300 | 7/7 | Apex predator, rarely misses |

**Time Control:** Thinking time is adjusted per level (5–30 seconds typically).

## Rule Compliance & Validation

### TZD Rule Alignment

Sidra is Russian draughts by default. The following TZD rules are enforced by `OfficialEngine`:

1. **Man Capture Direction:** Forward-only (no backward captures)
2. **Promotion Stops Capture:** Man reaching back rank stops immediately
3. **King Capture:** Same diagonal continuations allowed (no forced diagonal change)
4. **Threefold Repetition:** Game ends in draw
5. **King-Only 30-Move Rule:** No captures with kings for 30 moves = draw
6. **Endgame Draw Rules:** K vs K, K+man vs K, 3+ kings vs 1 king

### Validation Pipeline

```
Sidra Move (from, to)
         │
         ▼
SidraBoardMapper.fromSidraResponse()
  - Transform coordinates
  - Detect captured squares (geometric inference)
         │
         ▼
SidraEngineService.normalizeToOfficialMove()
  - Generate all legal moves using OfficialEngine
  - Check if (from, to) exists in legal moves
         │
         ├─ YES ──► Return normalized move
         │
         └─ NO ──► Fallback to random legal move
                   (logs warning)
```

## File Structure

```
TzDraft/
├── engines/sidra/
│   ├── SiDra.sln                    # Visual Studio solution
│   ├── *.cpp, *.h                   # C++ implementation
│   ├── bin/
│   │   ├── sidra-cli.exe            # CLI wrapper
│   │   └── SiDra.dll                # Compiled engine DLL
│   ├── cli/
│   │   ├── README.md                # CLI build instructions
│   │   └── sidra-cli.cpp            # CLI source
│   └── README_TZD.md                # Integration notes
├── backend/src/application/engines/
│   ├── sidra-engine.service.ts      # Main service
│   ├── sidra-mapper.ts              # Coordinate mapping
│   ├── sidra-types.ts               # TypeScript types
│   └── sidra-strategy.ts            # Difficulty strategies
└── docs/
    └── official_game_rule/
        └── sidra_tzd_adaptation.md # Rule compliance doc
```

## Building & Setup

### 1. Build Sidra DLL (Windows)

**Prerequisites:**
- Visual Studio with C++ build tools
- CMake (optional)

**Steps:**
```bash
cd engines/sidra
# Open SiDra.sln in Visual Studio
# Set Configuration: Release, Platform: x64
# Build > Build Solution
# Copy bin/x64/Release/SiDra.dll → bin/SiDra.dll
```

**Or use automation** (if available):
```powershell
.\build_sidra.ps1
```

### 2. Build CLI Wrapper

**From Developer Command Prompt:**
```bash
cd engines/sidra/cli
cl /EHsc /O2 sidra-cli.cpp /link /OUT:sidra-cli.exe
# Copy sidra-cli.exe → engines/sidra/bin/sidra-cli.exe
```

### 3. Configure Backend

**Set environment variable:**
```bash
SIDRA_CLI_PATH=C:\Users\Admin\Desktop\TzDraft\engines\sidra\bin\sidra-cli.exe
```

**Or** let the backend auto-detect:
```typescript
// Default search path
${projectRoot}/engines/sidra/bin/sidra-cli.exe
```

### 4. Fallback Behavior

If the CLI is missing, the backend gracefully falls back to random legal move generation:
```typescript
if (!existsSync(cliPath)) {
  console.warn('[SiDra] CLI not found, using fallback move');
  return this.fallbackOfficialMove(request);
}
```

## Error Handling & Debugging

### Logging Locations

1. **Console (Backend):**
   - `[SiDra] === Move Request ===`
   - `[SiDra] Current Player: WHITE`
   - `[SiDra] Sending transformed payload to CLI...`
   - `[SiDra] CLI Raw Output: ...`

2. **Debug Log File:**
   - `${projectRoot}/backend/sidra-debug.log`
   - Records: timestamp, error message, stack trace

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `ENOENT: no such file or directory 'sidra-cli.exe'` | CLI not built or path incorrect | Build CLI wrapper and verify path |
| `JSON parse error on substring` | Garbled CLI output | Check DLL compatibility, rebuild |
| `No JSON found in CLI output` | CLI crashed or output redirected | Check SIDRA_CLI_PATH, verify DLL |
| Move rejected by official rules | Sidra rule mismatch | Valid; fallback handles it |
| Move takes >5 seconds | Think time too high | Reduce timeLimitMs; check system load |

## Performance & Optimization

### Thinking Time Per Level

```typescript
const THINK_TIME_MS = {
  1: 500,    // Swala: quick
  2: 1000,
  3: 2000,
  4: 3000,
  5: 5000,
  6: 10000,
  7: 20000   // Simba: deep analysis
};
```

### Async Execution

```typescript
// Non-blocking subprocess spawn
const { stdout } = await this.executeSidraCli(payload);
// Backend remains responsive; frontend shows "Thinking..." indicator
```

### Caching

Currently **not cached** (each move request triggers fresh computation). Future optimization: memoize opening book moves.

## Integration Examples

### Frontend Hook Usage

```typescript
import { useSidraGame } from '@/hooks/useSidraGame';

export default function GamePage() {
  const { state, makeMove } = useSidraGame(
    aiLevel: 3,          // Nyati (1100 ELO)
    playerColor: WHITE,
    timeSeconds: 300
  );

  // On player move
  const handleMove = (from: number, to: number) => {
    makeMove({ from, to });
    // AI thinks & responds automatically
  };
}
```

### Direct Service Usage (Backend)

```typescript
import { SidraEngineService } from '@tzdraft/backend';

// In a use case or controller
async createSidraGame(request: CreateGameDto) {
  const sidraService = this.getDependency(SidraEngineService);
  
  const aiMove = await sidraService.getMove({
    pieces: currentBoard.pieces,
    currentPlayer: currentPlayer,
    moveCount: game.moveCount,
    timeLimitMs: 3000
  });
  
  return aiMove;
}
```

## Future Improvements

1. **Rule Compliance Completeness**
   - Full TZD adaptation in native Sidra code
   - Eliminate fallback by ensuring 100% compliance

2. **Performance**
   - Move memoization with opening book
   - Multi-threading for deeper search at high levels

3. **Analysis Features**
   - Endgame tablebase lookup
   - Best move suggestion API for tutorials

4. **Adaptive Learning**
   - Track player patterns
   - Adjust strategy based on opponent style

## References

- [Sidra GitHub](https://github.com/Igor2001/SiDra) (Original engine)
- [Tanzania Drafti Rules v2.2](../../official_game_rule/Tanzania_Draughts_64_Official_Rules_v2.2_PUBLICATION_READY.md)
- [TZD Rule Adaptation](../official_game_rule/sidra_tzd_adaptation.md)
- [CAKE Engine](./CAKE_ENGINE_IMPLEMENTATION.md)

## Support & Troubleshooting

For integration issues:
1. Check [official_game_rule/sidra_tzd_adaptation.md](../official_game_rule/sidra_tzd_adaptation.md) for rule compliance details
2. Review [sidra-debug.log](../../backend/sidra-debug.log) for recent errors
3. Verify CLI and DLL are present: `engines/sidra/bin/sidra-cli.exe`, `engines/sidra/bin/SiDra.dll`
4. Confirm backend environment variable is set: `SIDRA_CLI_PATH`

---

**Last Updated:** 2026-02-16  
**Author:** TzDraft Development Team
