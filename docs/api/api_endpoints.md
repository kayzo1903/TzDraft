# TzDraft API - All Endpoints

Complete reference for all REST API endpoints.

---

## 🎮 Game Management

### Create PvP Game

```
POST /games/pvp
```

**Request Body**:

```json
{
  "whitePlayerId": "player-001",
  "blackPlayerId": "player-002",
  "whiteElo": 1400,
  "blackElo": 1350
}
```

**Response (201)**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ACTIVE",
    "gameType": "RANKED",
    "currentTurn": "WHITE"
  }
}
```

---

### Create PvE Game

```
POST /games/pve
```

**Request Body**:

```json
{
  "playerId": "player-001",
  "playerColor": "WHITE",
  "playerElo": 1200,
  "aiLevel": 3
}
```

**AI Levels**: 1 (Beginner) to 7 (Master)

**Response (201)**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "gameType": "AI",
    "aiLevel": 3
  }
}
```

---

### Get Game by ID

```
GET /games/:id
```

**Response (200)**:

```json
{
  "success": true,
  "data": {
    "game": { ... },
    "moves": [ ... ]
  }
}
```

---

### Get Game State (Paginated)

```
GET /games/:id/state?skip=0&take=50
```

**Query Parameters**:

- `skip`: Number of moves to skip (default: 0)
- `take`: Number of moves to return (default: 50)

**Response (200)**:

```json
{
  "success": true,
  "data": {
    "game": { ... },
    "moves": [ ... ],
    "totalMoves": 42
  }
}
```

---

## 🎯 Moves

### Make Move

```
POST /games/:gameId/moves?playerId=player-001
```

**Request Body** (Simple Move):

```json
{
  "from": 9,
  "to": 13
}
```

**Request Body** (Capture):

```json
{
  "from": 13,
  "to": 22
}
```

**Request Body** (Multi-Capture):

```json
{
  "from": 13,
  "to": 22,
  "path": [18, 25]
}
```

**Response (200)**:

```json
{
  "success": true,
  "data": {
    "game": {
      "currentTurn": "BLACK"
    },
    "move": {
      "moveNumber": 1,
      "player": "WHITE",
      "from": 9,
      "to": 13,
      "capturedSquares": [],
      "notation": "9-13"
    }
  }
}
```

---

### Get Legal Moves (All)

```
GET /games/:gameId/moves/legal
```

**Response (200)**:

```json
{
  "success": true,
  "data": [
    {
      "from": 9,
      "to": 13,
      "notation": "9-13"
    },
    {
      "from": 9,
      "to": 14,
      "notation": "9-14"
    }
  ]
}
```

---

### Get Legal Moves (Specific Piece)

```
GET /games/:gameId/moves/legal/:position
```

**Example**: `GET /games/uuid/moves/legal/10`

**Response (200)**:

```json
{
  "success": true,
  "data": [
    {
      "from": 10,
      "to": 14,
      "notation": "10-14"
    }
  ]
}
```

---

## 🏁 Game Termination

### Resign

```
POST /games/:gameId/moves/resign?playerId=player-001
```

**Response (200)**:

```json
{
  "success": true,
  "message": "Game resigned successfully"
}
```

**Effect**: Opponent wins, game status = FINISHED

---

### Draw by Agreement

```
POST /games/:gameId/moves/draw
```

**Response (200)**:

```json
{
  "success": true,
  "message": "Game ended in draw"
}
```

**Effect**: Winner = DRAW, game status = FINISHED

---

### Abort Game

```
POST /games/:gameId/moves/abort
```

**Response (200)**:

```json
{
  "success": true,
  "message": "Game aborted successfully"
}
```

**Constraint**: Only works if no moves have been made

**Error (400)**:

```json
{
  "statusCode": 400,
  "message": "Cannot abort game after moves are made"
}
```

---

## ❌ Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Invalid move"
}
```

**Common Causes**:

- Invalid move
- Wrong turn
- Validation errors

---

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Game with ID uuid not found"
}
```

---

### 422 Validation Error

```json
{
  "statusCode": 400,
  "message": ["from must not be less than 1", "to must not be greater than 32"]
}
```

---

## 📊 Board Positions

Tanzania Drafti uses positions 1-32 for dark squares:

```
    32  31  30  29
  28  27  26  25
    24  23  22  21
  20  19  18  17
    16  15  14  13
  12  11  10   9
     8   7   6   5
   4   3   2   1
```

**White**: Starts at positions 1-12
**Black**: Starts at positions 21-32

---

**Total Endpoints**: 10
