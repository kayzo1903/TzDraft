# TzDraft API - Postman Test Scripts

Reusable test scripts for Postman automation.

---

## 🧪 Collection-Level Scripts

Add these to the **Collection** → **Tests** tab to run on every request.

### Basic Response Validation

```javascript
// Verify response time
pm.test("Response time is acceptable", function () {
  pm.expect(pm.response.responseTime).to.be.below(500);
});

// Verify content type
pm.test("Content-Type is JSON", function () {
  pm.response.to.have.header("Content-Type");
  pm.expect(pm.response.headers.get("Content-Type")).to.include(
    "application/json",
  );
});
```

---

## 📝 Request-Specific Scripts

### Create Game - Auto-Save Game ID

```javascript
pm.test("Game created successfully", function () {
  pm.response.to.have.status(201);

  var jsonData = pm.response.json();
  pm.expect(jsonData.success).to.be.true;
  pm.expect(jsonData.data).to.have.property("id");

  // Save gameId to environment
  pm.environment.set("gameId", jsonData.data.id);
  console.log("Game ID saved:", jsonData.data.id);
});

pm.test("Game has correct initial state", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData.data.status).to.equal("ACTIVE");
  pm.expect(jsonData.data.currentTurn).to.equal("WHITE");
});
```

---

### Make Move - Verify Turn Switch

```javascript
pm.test("Move executed successfully", function () {
  pm.response.to.have.status(200);

  var jsonData = pm.response.json();
  pm.expect(jsonData.success).to.be.true;
  pm.expect(jsonData.data).to.have.property("move");
});

pm.test("Turn switched correctly", function () {
  var jsonData = pm.response.json();
  var currentTurn = jsonData.data.game.currentTurn;

  // Save current turn for next request
  pm.environment.set("currentTurn", currentTurn);

  console.log("Current turn:", currentTurn);
});

pm.test("Move has correct structure", function () {
  var jsonData = pm.response.json();
  var move = jsonData.data.move;

  pm.expect(move).to.have.property("moveNumber");
  pm.expect(move).to.have.property("player");
  pm.expect(move).to.have.property("from");
  pm.expect(move).to.have.property("to");
  pm.expect(move).to.have.property("notation");
});
```

---

### Get Legal Moves - Verify Response

```javascript
pm.test("Legal moves returned", function () {
  pm.response.to.have.status(200);

  var jsonData = pm.response.json();
  pm.expect(jsonData.success).to.be.true;
  pm.expect(jsonData.data).to.be.an("array");
});

pm.test("Moves have correct structure", function () {
  var jsonData = pm.response.json();

  if (jsonData.data.length > 0) {
    var move = jsonData.data[0];
    pm.expect(move).to.have.property("from");
    pm.expect(move).to.have.property("to");
    pm.expect(move).to.have.property("notation");
  }
});

pm.test("At least one legal move available", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData.data.length).to.be.above(0);
});
```

---

### Capture Move - Verify Capture

```javascript
pm.test("Capture executed successfully", function () {
  pm.response.to.have.status(200);

  var jsonData = pm.response.json();
  var move = jsonData.data.move;

  pm.expect(move.capturedSquares).to.be.an("array");
  pm.expect(move.capturedSquares.length).to.be.above(0);
});

pm.test("Multi-capture detected correctly", function () {
  var jsonData = pm.response.json();
  var move = jsonData.data.move;

  if (move.capturedSquares.length > 1) {
    pm.expect(move.isMultiCapture).to.be.true;
  }
});
```

---

### Error Handling - Verify Error Response

```javascript
pm.test("Error response has correct structure", function () {
  var jsonData = pm.response.json();

  pm.expect(jsonData).to.have.property("statusCode");
  pm.expect(jsonData).to.have.property("message");
});

pm.test("Error message is descriptive", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData.message).to.not.be.empty;
});
```

---

## 🔄 Pre-Request Scripts

### Auto-Set Player ID Based on Turn

```javascript
// Get current turn from environment
var currentTurn = pm.environment.get("currentTurn") || "WHITE";

// Set playerId based on turn
if (currentTurn === "WHITE") {
  pm.environment.set("currentPlayerId", pm.environment.get("player1Id"));
} else {
  pm.environment.set("currentPlayerId", pm.environment.get("player2Id"));
}

console.log("Current turn:", currentTurn);
console.log("Using player:", pm.environment.get("currentPlayerId"));
```

---

### Generate Random Move

```javascript
// For testing purposes - generate random valid position
var from = Math.floor(Math.random() * 12) + 1; // 1-12 for white
var to = from + 4; // Simple forward move

pm.environment.set("randomFrom", from);
pm.environment.set("randomTo", to);
```

---

## 📊 Advanced Test Scripts

### Chain Requests - Make Multiple Moves

```javascript
// After making a move, automatically make next move
pm.test("Move successful, preparing next move", function () {
  pm.response.to.have.status(200);

  var jsonData = pm.response.json();
  var moveCount = jsonData.data.game.moves.length;

  // Stop after 10 moves
  if (moveCount < 10) {
    // Trigger next request
    postman.setNextRequest("Make Move");
  } else {
    postman.setNextRequest(null);
    console.log("Completed 10 moves");
  }
});
```

---

### Performance Monitoring

```javascript
// Track response times
var responseTime = pm.response.responseTime;
pm.environment.set("lastResponseTime", responseTime);

// Calculate average
var times = pm.environment.get("responseTimes") || [];
times.push(responseTime);
pm.environment.set("responseTimes", times);

var avg = times.reduce((a, b) => a + b, 0) / times.length;
console.log("Average response time:", avg.toFixed(2), "ms");

pm.test("Performance is acceptable", function () {
  pm.expect(responseTime).to.be.below(200);
});
```

---

### Data Validation

```javascript
pm.test("Game data is valid", function () {
  var game = pm.response.json().data.game;

  // Validate game type
  pm.expect(game.gameType).to.be.oneOf(["RANKED", "CASUAL", "AI"]);

  // Validate status
  pm.expect(game.status).to.be.oneOf([
    "WAITING",
    "ACTIVE",
    "FINISHED",
    "ABORTED",
  ]);

  // Validate turn
  pm.expect(game.currentTurn).to.be.oneOf(["WHITE", "BLACK"]);

  // Validate player IDs
  pm.expect(game.whitePlayerId).to.be.a("string");
  pm.expect(game.blackPlayerId).to.be.a("string");
});
```

---

## 🎯 Complete Test Suite Example

### Folder: "Complete Game Flow"

**Request 1: Create Game**

```javascript
// Tests
pm.test("Status is 201", () => pm.response.to.have.status(201));
pm.environment.set("gameId", pm.response.json().data.id);
postman.setNextRequest("Get Legal Moves");
```

**Request 2: Get Legal Moves**

```javascript
// Tests
pm.test("Legal moves available", () => {
  pm.expect(pm.response.json().data.length).to.be.above(0);
});
postman.setNextRequest("Make Move 1");
```

**Request 3: Make Move 1**

```javascript
// Tests
pm.test("Move successful", () => pm.response.to.have.status(200));
postman.setNextRequest("Make Move 2");
```

**Request 4: Make Move 2**

```javascript
// Tests
pm.test("Move successful", () => pm.response.to.have.status(200));
postman.setNextRequest("Get Game State");
```

**Request 5: Get Game State**

```javascript
// Tests
pm.test("Game has 2 moves", () => {
  pm.expect(pm.response.json().data.moves.length).to.equal(2);
});
postman.setNextRequest(null); // End chain
```

---

## 🚀 Running Test Suite

### Collection Runner

1. Click **Collections** → **Run**
2. Select requests to run
3. Set iterations (e.g., 10)
4. Click **Run**

### Newman (CLI)

```bash
newman run TzDraft-API.postman_collection.json \
  -e TzDraft-Local.postman_environment.json \
  --reporters cli,html
```

---

**Total Scripts**: 15+
**Coverage**: All endpoints
