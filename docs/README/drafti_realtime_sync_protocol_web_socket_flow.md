# Drafti – Realtime Sync Protocol (WebSocket Flow)

## 1. Purpose
This document defines the **authoritative realtime synchronization protocol** for Drafti using WebSockets.

It is inspired by **chess.com’s realtime model**, adapted for:
- Tanzania Drafti (8×8)
- Server-authoritative gameplay
- DDD monolith architecture

This protocol governs:
- Live gameplay
- Spectators
- Play vs Computer
- Reconnection & recovery

---

## 2. Core Realtime Principles

1. **Server is the single source of truth**
2. Clients are optimistic but never authoritative
3. All moves are validated server-side
4. WebSocket is state-sync, not game logic
5. Every message is idempotent

---

## 3. Connection Lifecycle

### 3.1 WebSocket Connection

```
Client → WS Gateway → Auth → Game Channel
```

Steps:
1. Client opens WebSocket
2. JWT/session validated
3. User joins one or more channels

Channels:
- `game:{gameId}`
- `spectate:{gameId}`

---

## 4. Message Envelope (Standard)

All realtime messages use a common envelope:

```
{
  type: string,
  gameId: UUID,
  payload: object,
  serverTime: number
}
```

---

## 5. Client → Server Events

### 5.1 JOIN_GAME

```
{
  type: "JOIN_GAME",
  gameId
}
```

Server response:
- Current game snapshot
- Player color
- Clock state

---

### 5.2 MAKE_MOVE

```
{
  type: "MAKE_MOVE",
  gameId,
  payload: {
    from: Square,
    to: Square,
    path?: Square[]
  }
}
```

Server:
1. Validates move
2. Persists move
3. Broadcasts result

---

### 5.3 RESIGN

```
{ type: "RESIGN", gameId }
```

---

### 5.4 REQUEST_SYNC

Used after reconnect.

```
{ type: "REQUEST_SYNC", gameId }
```

---

## 6. Server → Client Events

### 6.1 GAME_STATE

Full authoritative snapshot.

```
{
  type: "GAME_STATE",
  payload: {
    board,
    moves,
    clocks,
    turn,
    status
  }
}
```

---

### 6.2 MOVE_APPLIED

Broadcast after valid move.

```
{
  type: "MOVE_APPLIED",
  payload: {
    move,
    updatedBoard,
    clocks,
    nextTurn
  }
}
```

---

### 6.3 MOVE_REJECTED

```
{
  type: "MOVE_REJECTED",
  payload: { reason }
}
```

---

### 6.4 GAME_ENDED

```
{
  type: "GAME_ENDED",
  payload: { winner, reason }
}
```

---

## 7. Play vs Computer Flow

```
Human Move → Server Validate → Persist
→ Broadcast → Engine Think
→ Engine Move → Validation → Broadcast
```

Engine moves go through the **same pipeline**.

---

## 8. Spectator Flow

- Spectators are read-only
- Receive GAME_STATE on join
- Receive MOVE_APPLIED events

No private data sent.

---

## 9. Reconnection & Recovery

On reconnect:
1. Client sends REQUEST_SYNC
2. Server sends GAME_STATE
3. Client resumes normally

This avoids full reload.

---

## 10. Clock Synchronization

- Server owns clock
- Clients display projected time
- Clock updates sent with each move

---

## 11. Ordering & Idempotency

- Messages processed sequentially per game
- Duplicate MAKE_MOVE ignored if already applied

---

## 12. Error Handling

- Invalid state → MOVE_REJECTED
- Desync → forced GAME_STATE
- Cheating attempt → disconnect

---

## 13. DDD Placement

| Layer | Role |
|-----|-----|
| Interface | WebSocket Gateway |
| Application | Command handlers |
| Domain | Validation & rules |
| Infrastructure | Pub/Sub, persistence |

---

## 14. Scalability Notes

MVP:
- Single WS server
- In-memory game routing

Later:
- Redis pub/sub
- Horizontal scaling
- Game sharding

---

## 15. Summary

This protocol guarantees:
- Fair realtime play
- Chess.com–level responsiveness
- Engine safety
- Reconnection resilience

> Clients request. The server decides. Everyone stays in sync.

