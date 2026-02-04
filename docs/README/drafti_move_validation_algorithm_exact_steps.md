# Drafti – Move Validation Algorithm (Exact Steps)

## 1. Purpose
This document defines the **authoritative, step-by-step move validation algorithm** for Tanzania Drafti (8×8), strictly derived from the formal ruleset.

This algorithm is executed **only on the server** and is the final authority for:
- Human moves
- Engine moves
- Networked multiplayer

---

## 2. Core Principles

1. **Server is authoritative** – clients never validate finally
2. **Rules before convenience** – invalid moves are rejected early
3. **Maximum capture is mandatory**
4. **Multi-capture chains are atomic**
5. **Validation is deterministic**

---

## 3. Inputs & Outputs

### Input
```
validateMove(
  game: Game,
  moveRequest: {
    from: Position,
    to: Position,
    path?: Position[]   // for multi-capture
  }
)
```

### Output
- Valid → `ValidatedMove`
- Invalid → `ValidationError`

---

## 4. Validation Pipeline (High-Level)

```
1. Game state checks
2. Turn & ownership checks
3. Capture obligation detection
4. Piece-specific movement rules
5. Path & capture validation
6. Promotion check
7. State mutation
```

---

## 5. Step-by-Step Algorithm

### STEP 1: Game State Validation

Reject move if:
- Game status ≠ ACTIVE
- Game is finished or aborted

---

### STEP 2: Turn Validation

Reject move if:
- Player ≠ game.currentTurn

---

### STEP 3: Piece Ownership Validation

Reject move if:
- No piece exists at `from`
- Piece color ≠ current player

---

### STEP 4: Detect All Available Captures

Algorithm:
1. Iterate all pieces of current player
2. For each piece, compute possible captures
3. Collect all capture paths

Result:
```
availableCaptures: CapturePath[]
```

---

### STEP 5: Enforce Mandatory Capture

If `availableCaptures` is not empty:
- Reject any **non-capture** move

If multiple capture paths exist:
- Only paths with **maximum captures** are legal

---

### STEP 6: Validate Requested Move Type

#### Case A: Simple Move
Allowed only if:
- No capture is available globally
- Movement matches piece rules

#### Case B: Capture Move
Allowed only if:
- Requested path ∈ availableCaptures

---

### STEP 7: Piece-Specific Rules

#### Man
- Simple move: forward diagonal (1 square)
- Capture: diagonal jump (any direction)

#### King
- Simple move: any diagonal distance
- Capture: diagonal jump with landing beyond

---

### STEP 8: Multi-Capture Path Validation

For capture moves:

1. Ensure path is continuous
2. Each hop:
   - Jumps exactly one opponent piece
   - Lands on empty square
3. Captured pieces are unique
4. Path length equals max capture length

Reject if any condition fails.

---

### STEP 9: Promotion Check

If:
- Man reaches opponent back row
- Promotion happens **after move completes**

Promotion does NOT interrupt capture chain.

---

### STEP 10: Apply Move (State Mutation)

Atomically:
- Remove captured pieces
- Move piece
- Promote if applicable
- Switch turn
- Update clocks

---

### STEP 11: Post-Move Game-End Check

Check:
- Opponent has no legal moves → win
- Opponent has no pieces → win
- Time expired → loss
- Draw rules (if enabled)

---

## 6. Error Types

```
INVALID_TURN
NO_PIECE_AT_SOURCE
NOT_YOUR_PIECE
CAPTURE_REQUIRED
INVALID_CAPTURE_PATH
MAX_CAPTURE_VIOLATION
ILLEGAL_MOVEMENT
GAME_NOT_ACTIVE
```

---

## 7. Engine Move Handling

Engine moves:
- Treated identical to human moves
- Must pass full validation
- Rejected moves trigger fallback

---

## 8. Determinism Guarantee

Given:
- Same game state
- Same move request

Result:
- Always same validation outcome

---

## 9. DDD Placement

| Layer | Responsibility |
|-----|---------------|
| Domain | Validation rules |
| Domain Service | Capture detection |
| Application | Transaction orchestration |
| Infrastructure | Persistence |

---

## 10. Pseudocode Summary

```
if game.status != ACTIVE: reject
if player != game.turn: reject
if no piece at from: reject

captures = findAllCaptures(game, player)

if captures.exist:
  if move not capture: reject
  if move not max capture: reject

validateMovementRules()
applyMoveAtomically()
```

---

## 11. Summary

This algorithm guarantees:
- Rule correctness
- Multiplayer fairness
- Engine safety
- Chess.com–level integrity

> Every move is judged equally — human or machine.
