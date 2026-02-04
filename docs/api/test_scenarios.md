# TzDraft API - Test Scenarios

Complete test scenarios for Postman.

---

## Scenario 1: Complete PvP Game Flow

### Step 1: Create Game

```
POST /games/pvp
```

```json
{
  "whitePlayerId": "player-001",
  "blackPlayerId": "player-002",
  "whiteElo": 1400,
  "blackElo": 1350
}
```

**Save**: `gameId` from response

---

### Step 2: Get Legal Moves

```
GET /games/{{gameId}}/moves/legal
```

**Verify**: Returns array of legal moves for WHITE

---

### Step 3: Make First Move (White)

```
POST /games/{{gameId}}/moves?playerId=player-001
```

```json
{
  "from": 9,
  "to": 13
}
```

**Verify**: `currentTurn` = "BLACK"

---

### Step 4: Make Second Move (Black)

```
POST /games/{{gameId}}/moves?playerId=player-002
```

```json
{
  "from": 22,
  "to": 18
}
```

**Verify**: `currentTurn` = "WHITE"

---

### Step 5: Get Game State

```
GET /games/{{gameId}}
```

**Verify**:

- `moves` array has 2 moves
- Board state updated

---

## Scenario 2: Capture Sequence

### Setup

Create game and make moves to position for capture:

1. White: 9-13
2. Black: 22-18
3. White: 10-14
4. Black: 24-19

### Execute Capture

```
POST /games/{{gameId}}/moves?playerId=player-001
```

```json
{
  "from": 14,
  "to": 23
}
```

**Verify**:

- `capturedSquares`: [19]
- Piece at 19 removed from board

---

## Scenario 3: Multi-Capture

### Setup Position

Arrange pieces for multi-capture opportunity

### Execute Multi-Capture

```json
{
  "from": 13,
  "to": 22,
  "path": [18, 25]
}
```

**Verify**:

- `capturedSquares`: [18, 22]
- `isMultiCapture`: true
- Both pieces removed

---

## Scenario 4: Mandatory Capture

### Setup

Position where capture is available

### Try Simple Move (Should Fail)

```json
{
  "from": 10,
  "to": 14
}
```

**Expected Error (400)**:

```json
{
  "message": "Capture is mandatory"
}
```

### Make Capture (Should Succeed)

```json
{
  "from": 13,
  "to": 22
}
```

---

## Scenario 5: Promotion

### Setup

Move piece to back row

### Execute Move to Back Row

```json
{
  "from": 28,
  "to": 32
}
```

**Verify**:

- `isPromotion`: true
- Piece becomes KING

---

## Scenario 6: Game Termination

### 6A: Resignation

```
POST /games/{{gameId}}/moves/resign?playerId=player-001
```

**Verify**:

- Game status: FINISHED
- Winner: BLACK
- End reason: RESIGN

---

### 6B: Draw

```
POST /games/{{gameId}}/moves/draw
```

**Verify**:

- Game status: FINISHED
- Winner: DRAW
- End reason: DRAW

---

### 6C: Abort (No Moves)

Create new game, then:

```
POST /games/{{gameId}}/moves/abort
```

**Verify**: Game status: ABORTED

---

### 6D: Abort After Moves (Should Fail)

Make a move, then try abort:

```
POST /games/{{gameId}}/moves/abort
```

**Expected Error (400)**:

```json
{
  "message": "Cannot abort game after moves are made"
}
```

---

## Scenario 7: PvE Game

### Create AI Game

```
POST /games/pve
```

```json
{
  "playerId": "player-003",
  "playerColor": "WHITE",
  "playerElo": 1200,
  "aiLevel": 3
}
```

**Verify**:

- `gameType`: "AI"
- `blackPlayerId`: "AI"
- `aiLevel`: 3

### Make Player Move

```json
{
  "from": 9,
  "to": 13
}
```

**Note**: AI move generation not yet implemented

---

## Scenario 8: Error Handling

### 8A: Wrong Turn

When it's BLACK's turn, try WHITE move:

```
POST /games/{{gameId}}/moves?playerId=player-001
```

**Expected Error (400)**:

```json
{
  "message": "Not this player's turn"
}
```

---

### 8B: Invalid Position

```json
{
  "from": 0,
  "to": 100
}
```

**Expected Error (400)**:

```json
{
  "message": ["from must not be less than 1", "to must not be greater than 32"]
}
```

---

### 8C: Game Not Found

```
GET /games/invalid-uuid
```

**Expected Error (404)**:

```json
{
  "message": "Game with ID invalid-uuid not found"
}
```

---

### 8D: Move After Game Ended

Resign game, then try to make move:

**Expected Error (400)**:

```json
{
  "message": "Game is not active"
}
```

---

## ✅ Testing Checklist

### Basic Functionality

- [ ] Create PvP game
- [ ] Create PvE game
- [ ] Get game by ID
- [ ] Make simple move
- [ ] Get all legal moves
- [ ] Get legal moves for piece

### Game Rules

- [ ] Single capture
- [ ] Multi-capture
- [ ] Mandatory capture
- [ ] Promotion to King
- [ ] King movement

### Game Termination

- [ ] Resign
- [ ] Draw
- [ ] Abort (no moves)
- [ ] Abort with moves (error)

### Error Cases

- [ ] Wrong turn
- [ ] Invalid position
- [ ] Game not found
- [ ] Move after game ended
- [ ] Validation errors

---

**Total Scenarios**: 8
**Total Test Cases**: 30+
