# Drafti – Clock & Time-Control Mechanics (Exact Math)

## 1. Purpose
This document defines the **authoritative clock and time-control mechanics** for Tanzania Drafti (8×8) on the Drafti platform.

It ensures:
- Accurate countdowns
- Multiplayer fairness
- AI integration
- Spectator synchronization
- Reconnection safety

All timing is **server-authoritative**.

---

## 2. Core Principles
1. **Server is source of truth**: only server ticks clocks.
2. **Atomic time update**: moves update clocks immediately.
3. **Time units**: milliseconds (ms) for all calculations.
4. **Pause/Resume**: automatic on disconnect.
5. **Clock types supported**: Standard, Incremental, Delay.

---

## 3. Supported Time Controls

| Type | Definition |
|------|------------|
| Standard | Fixed total time per player, e.g., 10 min = 600,000 ms. Decreases per move. |
| Incremental | Adds fixed increment after each move, e.g., +5 sec = 5,000 ms. |
| Delay | Delay before clock starts, e.g., 2 sec = 2,000 ms. |

---

## 4. Core Data Model

```
clocks
------
game_id        UUID
white_time_ms  BIGINT  // remaining time
black_time_ms  BIGINT
last_move_at   TIMESTAMP // server tick when last move applied
```

Derived values:
- current_player = game.currentTurn
- elapsed_time = now - last_move_at

---

## 5. Clock Update Algorithm

### Step 1: Determine elapsed time
```
elapsed_ms = currentServerTime - clocks.last_move_at
```

### Step 2: Deduct from current player
```
if game.currentTurn == WHITE:
    clocks.white_time_ms -= elapsed_ms
else:
    clocks.black_time_ms -= elapsed_ms
```

### Step 3: Apply increment (if applicable)
```
if game.timeControlType == INCREMENTAL:
    clocks[currentPlayer] += game.increment_ms
```

### Step 4: Apply delay (if applicable)
```
if game.timeControlType == DELAY:
    effectiveElapsed = max(0, elapsed_ms - game.delay_ms)
    clocks[currentPlayer] -= effectiveElapsed
```

### Step 5: Update last_move_at
```
clocks.last_move_at = currentServerTime
```

### Step 6: Check timeout
```
if clocks[currentPlayer] <= 0:
    game.status = FINISHED
    game.winner = otherPlayer
    endReason = TIME
```

---

## 6. Move Integration

1. Before move validation:
   - Update clocks with elapsed time
2. After move accepted:
   - Apply increment or delay
   - Switch turn
3. Broadcast updated clocks via WebSocket

---

## 7. Spectator Handling

- Spectators receive clock updates **after every move**
- Optional tick broadcasting (e.g., every 1 sec) for smooth display
- Clocks are **derived from server state**

---

## 8. AI Integration

- AI move generation uses server clock snapshot
- AI is not subject to network lag
- AI moves are applied same as human moves

---

## 9. Reconnection Flow

1. Client reconnects
2. Sends `REQUEST_SYNC`
3. Server responds with:
   - Current game state
   - Current clocks
   - Last move timestamp
4. Client resumes display

Ensures **no clock drift**.

---

## 10. DDD Placement

| Layer | Responsibility |
|-------|----------------|
| Domain | Clock calculation & validation |
| Application | Transaction orchestration per move |
| Infrastructure | Timestamp retrieval, persistence |

---

## 11. Exact Math Example

**Game:** 10 min + 5 sec increment
- White starts: 10:00.000
- White moves at t=30,000 ms
  - Deduct 30,000 → 9:30.000
  - Add increment 5,000 → 9:35.000
- Black moves at t=50,000 ms
  - Deduct 50,000 → 9:10.000
  - Add increment 5,000 → 9:15.000

Every tick uses **serverTime - last_move_at** calculation

---

## 12. Summary

This clock design ensures:
- Exact timing (ms)
- Fairness for human & AI
- Reconnection safety
- Incremental and delay support
- Spectator-friendly

> Time is the final arbiter — server decides the winner if clock runs out.

