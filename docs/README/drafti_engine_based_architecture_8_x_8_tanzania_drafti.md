# Drafti – System Architecture Document
## Monolith DDD with Engine Support (8×8 Tanzania Drafti)

---

## 1. Purpose of This Document

This document defines the **official system architecture** for the Drafti platform MVP. The architecture is designed to:
- Start **small and fast**
- Support **Player vs Player** and **Player vs Computer**
- Use **free draughts engines** for computer play
- Scale safely toward a chess.com–level platform

The system follows a **Monolith + Domain-Driven Design (DDD)** approach inspired by **chess.com**.

---

## 2. Architectural Principles

1. **Single deployable monolith** for MVP
2. Clear **domain boundaries** (DDD)
3. **Authoritative server** (all moves validated server-side)
4. One **strong engine**, multiple difficulty levels
5. Engine logic isolated from game rules

---

## 3. High-Level System Components

```text
API Server
Realtime Server
Matchmaking Worker
Bot Engine Adapter
```

### Component Responsibilities

- **API Server**: REST/HTTP endpoints for accounts, games, ratings
- **Realtime Server**: Live gameplay via WebSockets
- **Matchmaking Worker**: Creates matches (PvP and PvE)
- **Bot Engine Adapter**: Integrates draughts engine

All components live inside **one monolith** for MVP.

---

## 4. Domain-Driven Design (DDD) Structure

### 4.1 Identity & Rating Context

**Responsibilities**
- User accounts
- Guest players
- Player ratings (ELO/ILO-style)

**Entities**
- User
- PlayerProfile
- Rating

---

### 4.2 Game Domain (Core Domain)

This is the **most critical domain** in Drafti.

**Responsibilities**
- Tanzania Drafti 8×8 rules
- Move validation
- Capture enforcement
- King movement rules
- Game end detection

**Entities**
- Game
- Board
- Piece
- Move

**Rules**
- Deterministic logic
- No UI or engine dependencies
- Same input always produces same output

---

### 4.3 Matchmaking Context

**Responsibilities**
- Player vs Player matching
- Player vs Computer game creation
- Rating-based pairing

**Key Concepts**
- GameRequest
- Match
- Queue

---

### 4.4 Realtime Gameplay Context

Inspired by chess.com live games.

**Responsibilities**
- Real-time move delivery
- Game clocks
- Reconnection handling
- Game events broadcast

**Technology**
- WebSockets or Socket.IO

---

### 4.5 Bot & Engine Context

Handles all computer-player logic.

**Responsibilities**
- Communicate with draughts engine
- Control difficulty levels
- Translate engine output into valid moves

---

## 5. Draughts Engine Strategy

### 5.1 Engine Philosophy (Chess.com Style)

Drafti uses **one strong engine** and simulates weaker players by limiting engine strength.

There are **not multiple engines**.

---

### 5.2 Recommended Free Engine

**CAKE Draughts Engine**
- Supports 8×8 draughts
- Open source
- CLI-based
- Very strong at full strength

CAKE acts as the "perfect player".

---

## 6. Bot Difficulty Levels (ILO / ELO Simulation)

| Level | Target Rating | Engine Depth | Randomness |
|------|---------------|--------------|------------|
| Beginner | 350 | 1 | Very High |
| Easy | 750 | 2–3 | High |
| Medium | 1000 | 4–5 | Medium |
| Normal | 1200 | 6–7 | Low |
| Strong | 1500 | 8–9 | Very Low |
| Expert | 2000 | 12 | None |
| Master | 2500 | 16+ | None |

Difficulty is controlled by:
- Search depth
- Thinking time
- Random selection among top moves

---

## 7. Bot Engine Adapter Layer

### Purpose

The adapter isolates engine logic from game logic.

**Responsibilities**
- Start and stop engine
- Send board state
- Request move at given difficulty
- Parse engine response

**Benefits**
- Engine can be replaced later
- Game domain remains clean
- Easier testing

---

## 8. Player vs Computer Move Flow

```text
Player Move
 → Game Domain validates move
 → Board updated
 → Bot Engine Adapter called
 → Engine calculates move
 → Game Domain validates engine move
 → Realtime Server broadcasts update
```

Engine moves never bypass game rules.

---

## 9. Matchmaking Logic (MVP)

### Player vs Computer
- Instant game creation
- User selects difficulty
- Bot assigned directly

### Player vs Player
- Simple rating-based queue
- No tournaments in MVP

---

## 10. Persistence Model (MVP)

Stored data:
- Game metadata
- Move history
- Final results
- Ratings
- Bot difficulty used

This enables replays and analytics later.

---

## 11. Non-Goals for MVP

The following are explicitly excluded:
- Spectator mode
- Chat
- Anti-cheat systems
- Bot personalities
- Tournaments

---

## 12. Scalability Path

When Drafti grows:
- Realtime Server can be extracted
- Bot Engine can run as separate service
- Matchmaking can scale independently

No rewrite required.

---

## 13. Summary

This architecture:
- Is production-inspired
- Matches chess.com design philosophy
- Supports Tanzania Drafti rules
- Enables strong and weak bots
- Starts small but scales safely

---

**This document is the authoritative reference for Drafti MVP architecture.**

