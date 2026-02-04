# Drafti – Engine Move Translation Specification

## 1. Purpose
This document defines the **authoritative translation layer** between the Drafti game domain (Tanzania Drafti 8×8) and the external draughts engine (CAKE).

The goal is to ensure:
- Deterministic move exchange
- Rule-safe engine usage
- Engine isolation from Drafti domain logic
- Long-term engine replaceability

This layer is mandatory for **Play vs Computer**, **Hints**, and **Analysis**.

---

## 2. Core Principle

> **The engine never owns the game rules.**

Drafti:
- Owns board state
- Owns legality
- Owns captures & promotions

CAKE:
- Evaluates positions
- Suggests best move
- Scores positions

The translation layer converts between the two **without leaking responsibility**.

---

## 3. Board Coordinate Mapping

### 3.1 Drafti Board Model
- 8×8 board
- Coordinates: `(row, col)`
- Row `0` = top (Black side)
- Row `7` = bottom (White side)
- Only dark squares are playable

Example:
```
(0,0) (0,1) (0,2) ... (0,7)
(1,0) (1,1) (1,2) ... (1,7)
...
```

---

### 3.2 CAKE Board Model
CAKE uses **32 playable squares**, indexed:

```
1  2  3  4
5  6  7  8
9 10 11 12
...
29 30 31 32
```

Only dark squares exist.

---

### 3.3 Mapping Table

Drafti (row,col) → CAKE square number:

Rule:
- If `(row + col) % 2 == 0` → invalid square
- Else → playable

Mapping formula:
```
square = (row * 4) + (col // 2) + 1
```

This mapping must be **centralized** in `EngineBoardMapper`.

---

## 4. Piece Mapping

| Drafti Domain | CAKE Engine |
|--------------|------------|
| Man (White)  | w           |
| Man (Black)  | b           |
| King (White) | W           |
| King (Black) | B           |

Promotion rules remain **Drafti-owned**.

---

## 5. Move Representation

### 5.1 Drafti Move

```
Move {
  from: Position
  to: Position
  captured: Position[]
  isPromotion: boolean
}
```

Supports multi-capture chains.

---

### 5.2 CAKE Move Format

CAKE uses numeric notation:

- Simple move: `12-16`
- Capture move: `22x17x10`

---

### 5.3 Translation: Drafti → CAKE

Steps:
1. Convert `from` → CAKE square
2. Convert `to` → CAKE square
3. Convert each capture hop in order
4. Build CAKE string

Example:
```
Drafti: (5,2) → (3,4) capturing (4,3)
CAKE: 22x17
```

---

### 5.4 Translation: CAKE → Drafti

Steps:
1. Parse CAKE move string
2. Convert each square → `(row,col)`
3. Build Move object
4. Validate using Drafti rules

⚠️ Engine moves are **never trusted blindly**.

---

## 6. Multi-Capture Enforcement

Drafti rules:
- Maximum capture is mandatory
- Engine suggestions violating this are rejected

Flow:
1. Engine suggests move
2. Drafti validates capture length
3. Reject or accept

---

## 7. Engine Request Flow

```
Game → EngineAdapter → CAKE → EngineAdapter → Game
```

Responsibilities:
- Adapter: translation only
- Game: legality & state mutation

---

## 8. Difficulty Levels (ELO Simulation)

Drafti difficulty levels map to engine parameters:

| Drafti Level | Approx ELO | Engine Control |
|-------------|-----------|---------------|
| Beginner    | 350       | Random depth  |
| Easy        | 750       | Depth 2       |
| Medium      | 1000      | Depth 4       |
| Hard        | 1500      | Depth 6       |
| Expert     | 2000      | Depth 8       |
| Master     | 2500      | Depth 10+     |

Engine strength is simulated using:
- Search depth
- Randomization
- Time limits

---

## 9. Error Handling & Safety

- Invalid engine move → rejected
- Desync detected → game aborted
- Engine timeout → fallback move or resignation

---

## 10. Replaceability Guarantee

This spec guarantees:
- CAKE can be replaced
- Engine code never touches domain logic
- Offline analysis remains possible

---

## 11. Versioning

- Spec Version: 1.0
- Rule Dependency: Tanzania Drafti Rules v1.0
- Engine: CAKE (reference)

---

## 12. Summary

This translation layer is the **contract boundary** between intelligence and rules.

> Drafti thinks. The engine suggests. Drafti decides.

