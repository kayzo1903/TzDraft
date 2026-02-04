# TzDraft API - Postman Quick Start

Quick guide to start testing the Tanzania Drafti REST API.

---

## 📋 Prerequisites

- **Backend Running**: `npm run start:dev` (Port 3000)
- **Database**: PostgreSQL connected
- **Postman**: Installed or web version

---

## 🔧 Setup

### 1. Base Configuration

**Base URL**: `http://localhost:3000`

**Headers** (All Requests):

```
Content-Type: application/json
```

### 2. Environment Variables

Create a Postman environment named "TzDraft Local":

| Variable    | Value                       |
| ----------- | --------------------------- |
| `baseUrl`   | `http://localhost:3000`     |
| `player1Id` | `player-001`                |
| `player2Id` | `player-002`                |
| `gameId`    | _(auto-set from responses)_ |

---

## 🚀 First Test - Create a Game

### Request

```
POST {{baseUrl}}/games/pvp
Content-Type: application/json
```

### Body

```json
{
  "whitePlayerId": "{{player1Id}}",
  "blackPlayerId": "{{player2Id}}",
  "whiteElo": 1400,
  "blackElo": 1350
}
```

### Expected Response (201)

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "status": "ACTIVE",
    "gameType": "RANKED",
    "whitePlayerId": "player-001",
    "blackPlayerId": "player-002",
    "currentTurn": "WHITE"
  }
}
```

### Auto-Save Game ID

Add to **Tests** tab:

```javascript
pm.test("Game created", function () {
  pm.response.to.have.status(201);
  var jsonData = pm.response.json();
  pm.environment.set("gameId", jsonData.data.id);
});
```

---

## 📁 Collection Structure

```
TzDraft API/
├── 1. Game Management/
├── 2. Moves/
├── 3. Game Termination/
└── 4. Error Cases/
```

---

## ✅ Next Steps

1. ✅ Create PvP game (above)
2. 📖 See api_endpoints.md for all endpoints
3. 🧪 See test_scenarios.md for complete flows
4. 🐛 See troubleshooting.md for common issues

---

**Status**: Ready to Test ✅
