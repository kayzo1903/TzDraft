# Drafti – Optimized Capture-Finding Algorithm

## 1. Purpose
This document defines an **optimized capture-finding algorithm** for Tanzania Drafti (8×8).

It ensures:
- Maximum capture enforcement
- Multi-capture chain detection
- Efficient runtime for online play and AI computation
- Direct integration with move validation and engine translation

---

## 2. Core Principles
1. **Server-authoritative**: Algorithm runs only on the server.
2. **All captures must be detected**: for mandatory capture rule enforcement.
3. **Multi-capture chains must be maximal**: reject suboptimal capture paths.
4. **Deterministic ordering**: ensures consistent behavior.
5. **Efficiency**: uses recursive DFS with pruning.

---

## 3. Data Structures

### 3.1 Board Representation
- 8x8 array
- Each cell:
  - Empty
  - WhiteMan, BlackMan, WhiteKing, BlackKing

### 3.2 Capture Path
```
CapturePath {
  moves: Position[]  // landing positions
  captures: Position[] // positions of captured pieces
  piece: Piece       // moving piece
}
```

### 3.3 Output
```
availableCaptures: CapturePath[]
```

---

## 4. Algorithm Overview

1. Iterate all player pieces
2. For each piece:
   - Start DFS search for captures
   - Explore all jump directions
   - Track captured pieces to avoid duplicates
   - Record complete capture paths
3. After all pieces:
   - Filter paths to only include maximum captures

---

## 5. Recursive DFS Steps

```
function findCaptures(piece, position, board, capturedSoFar):
  paths = []
  for each diagonal direction:
    next = position + 2 squares in direction
    mid = position + 1 square in direction

    if mid contains opponent piece AND next is empty AND mid not in capturedSoFar:
        newCaptured = capturedSoFar + mid
        newBoard = board.clone()
        remove mid from newBoard
        move piece to next in newBoard

        furtherPaths = findCaptures(piece, next, newBoard, newCaptured)
        if furtherPaths empty:
            paths.push(CapturePath{moves:[next], captures:newCaptured})
        else:
            for p in furtherPaths:
                paths.push(CapturePath{moves:[next]+p.moves, captures:newCaptured+p.captures})
  return paths
```

- Ensures **no piece is captured twice**
- Explores all multi-jump possibilities
- DFS prunes paths that cannot reach maximum captures

---

## 6. Max Capture Filtering

```
maxCaptures = max(path.captures.length for path in allPaths)
availableCaptures = [p for p in allPaths if p.captures.length == maxCaptures]
```

- Guarantees **mandatory maximum capture enforcement**

---

## 7. Optimization Techniques

1. **Clone board once per DFS branch** – avoid mutation
2. **Memoization** – optional for repeated sub-board states
3. **Early pruning** – discard paths shorter than current max
4. **Iterative deepening** – optional for AI with depth limit

---

## 8. Integration with Validation

1. Move validation first calls `findAllCaptures(player)`
2. Determines mandatory captures
3. Checks requested move against available capture paths
4. Returns validation result

---

## 9. Engine Integration

- Engine moves translated → validate via capture paths
- Ensure AI respects **maximum capture rule**
- Supports difficulty-level heuristics by pruning or partial path selection for lower levels

---

## 10. Time Complexity

- Worst-case: O(n!) for heavily populated boards
- Practical case: ≤ 8 pieces per player → manageable
- Optimizations reduce redundant branches significantly

---

## 11. DDD Placement

| Layer | Responsibility |
|-------|----------------|
| Domain Service | Capture-finding algorithm, mandatory max capture enforcement |
| Application | Orchestrate move validation calls |
| Infrastructure | Board state cloning, performance monitoring |

---

## 12. Summary

This algorithm guarantees:
- Complete multi-capture detection
- Maximum capture enforcement
- Deterministic, server-side behavior
- Efficiency for online play and AI integration

> Capture detection is the backbone of Drafti’s rule enforcement — correctness here ensures fair gameplay and engine safety.

