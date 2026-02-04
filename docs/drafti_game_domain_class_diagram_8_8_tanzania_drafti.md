# Drafti – Game Domain Class Diagram
## Based on Formal Tanzania Drafti Rule Specification (8×8)

---

## 1. Purpose of This Document

This document defines the **Game Domain class structure** for Drafti, strictly derived from the **Formal Tanzania Drafti Rule Specification (8×8)**.

It describes:
- Core domain entities
- Value objects
- Aggregates
- Domain services
- Relationships and responsibilities

This domain model is:
- Framework-agnostic
- Engine-agnostic
- Database-agnostic

---

## 2. Game Domain Overview

The **Game** aggregate is the authoritative root of all gameplay state.

```text
Game (Aggregate Root)
 ├── Board
 ├── Pieces
 ├── Players
 ├── Turn
 └── GameStatus
```

All rule enforcement flows through this aggregate.

---

## 3. Core Entities

### 3.1 Game (Aggregate Root)

**Responsibilities**
- Owns game state
- Enforces turn order
- Applies moves
- Determines game end

**Attributes**
- gameId
- board: Board
- currentTurn: PlayerColor
- status: GameStatus
- moveHistory: List<Move>
- ruleVersion

**Key Methods**
- applyMove(move: Move)
- isFinished(): boolean
- getWinner(): PlayerColor | null

---

### 3.2 Board

**Responsibilities**
- Represents the 8×8 board
- Holds piece positions

**Attributes**
- squares: Map<Position, Piece>

**Key Methods**
- getPiece(position)
- placePiece(piece, position)
- removePiece(position)
- isInsideBoard(position): boolean
- isEmpty(position): boolean

---

### 3.3 Piece

**Responsibilities**
- Represents a single draughts piece

**Attributes**
- id
- color: PlayerColor
- type: PieceType (MAN | KING)
- position: Position

**Key Methods**
- promoteToKing()

---

### 3.4 Player (Value Holder)

**Responsibilities**
- Represents a participant in the game

**Attributes**
- color: PlayerColor

---

### 3.5 Move

**Responsibilities**
- Represents a single player action

**Attributes**
- from: Position
- to: Position
- captures: List<Position>

**Notes**
- A multi-capture move is represented as one Move instance

---

## 4. Value Objects

### 4.1 Position

**Attributes**
- row (1–8)
- column (A–H)

**Rules**
- Must be a dark square
- Must be inside board bounds

---

### 4.2 PlayerColor

**Values**
- WHITE
- BLACK

---

### 4.3 PieceType

**Values**
- MAN
- KING

---

### 4.4 GameStatus

**Values**
- ONGOING
- WIN_WHITE
- WIN_BLACK
- DRAW

---

## 5. Domain Services

### 5.1 MoveValidator (Domain Service)

**Responsibilities**
- Validates move legality
- Enforces mandatory captures
- Validates multi-capture sequences

**Methods**
- validateMove(game: Game, move: Move)

---

### 5.2 CaptureResolver

**Responsibilities**
- Determines available captures
- Resolves multi-capture logic

**Methods**
- getAvailableCaptures(piece, board)

---

### 5.3 PromotionService

**Responsibilities**
- Handles king promotion rules

**Methods**
- checkPromotion(piece, position)

---

## 6. Aggregates & Invariants

### Game Aggregate Invariants

- Only the current player may move
- Mandatory capture must be enforced
- Moves must follow piece movement rules
- Game state must remain valid after every move

---

## 7. Relationships Summary

```text
Game
 ├── Board
 │    └── Piece (0..*)
 ├── Move (0..*)
 └── PlayerColor
```

- Board contains pieces
- Game controls board mutations
- Moves never mutate board directly

---

## 8. Engine Interaction Boundary

- Engine produces candidate Move
- MoveValidator validates it
- Game applies it only if valid

Engine has **no access** to Board or Piece directly.

---

## 9. Testing Implications

This domain model allows:
- Pure unit testing
- Rule-based test cases
- Engine move validation tests

No infrastructure required for testing.

---

## 10. Conclusion

This class diagram defines the **complete Game Domain model** for Drafti, strictly aligned with the Tanzania Drafti 8×8 rules.

It is stable, testable, and suitable for competitive play.

---

**This document is authoritative for all Drafti game-domain implementations.**

