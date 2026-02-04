# Drafti – Technology Stack & DDD Integration
## In-Depth Foundation Document (Chess.com–Inspired)

---

## 1. Purpose of This Document

This document explains **how the Drafti technology stack is structured** and **how it integrates with Domain-Driven Design (DDD)**. It serves as a **foundation reference** for developers building the Drafti MVP and beyond.

The architecture is inspired by **chess.com**, but adapted for:
- Tanzania Drafti (8×8)
- Small MVP start
- Clean scalability

---

## 2. Chosen Technology Stack

### 2.1 Backend (Monolith)

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: NestJS
- **Architecture Style**: Modular Monolith + DDD

NestJS is chosen because:
- It enforces modular structure
- It maps naturally to DDD layers
- It supports REST, WebSockets, and background workers in one app

---

### 2.2 Database & Persistence

- **Database**: PostgreSQL
- **ORM**: Prisma or Drizzle

Reasons:
- Strong relational model for games & moves
- Transaction support (important for game consistency)
- Easy migration to sharding later

---

### 2.3 Realtime Communication

- **Protocol**: WebSockets
- **Library**: Socket.IO or native WS

Used for:
- Live moves
- Timers
- Reconnect logic

---

### 2.4 Draughts Engine

- **Engine**: CAKE (free, open-source)
- **Integration Mode**: CLI process via adapter

CAKE provides strong 8×8 draughts play and acts as the "perfect player".

---

## 3. DDD Overview in Drafti

Drafti uses **Domain-Driven Design** to keep game logic correct, testable, and independent from technology choices.

### Key DDD Principles Applied

1. Business rules live in the domain
2. Infrastructure depends on the domain, not the reverse
3. Clear boundaries between contexts
4. One authoritative source of truth (server)

---

## 4. Project Structure (Monolith)

```text
src/
 ├── domains/
 │    ├── game/
 │    ├── matchmaking/
 │    ├── identity/
 │    ├── rating/
 │    └── bot/
 ├── application/
 ├── infrastructure/
 └── interfaces/
```

Each folder maps directly to a DDD responsibility.

---

## 5. DDD Layers Explained

### 5.1 Domain Layer (Core Logic)

**Purpose**: Represent Tanzania Drafti rules and concepts.

**Contains**:
- Entities (Game, Board, Move)
- Value Objects (Position, PlayerColor)
- Domain Services (MoveValidator)

**Rules**:
- No framework imports
- No database access
- No engine access

This layer is fully testable in isolation.

---

### 5.2 Application Layer (Use Cases)

**Purpose**: Coordinate user actions.

**Contains**:
- Use cases
- Command handlers
- Query handlers

**Examples**:
- CreateGameUseCase
- MakeMoveUseCase
- PlayVsBotUseCase

This layer:
- Calls domain logic
- Uses repositories via interfaces
- Calls bot engine via interfaces

---

### 5.3 Infrastructure Layer (Technical Implementation)

**Purpose**: Implement external systems.

**Contains**:
- Database repositories (Prisma/Drizzle)
- CAKE engine adapter
- External services

**Important Rule**:
Infrastructure depends on application & domain, never the opposite.

---

### 5.4 Interface Layer (Entry Points)

**Purpose**: Allow external clients to interact with the system.

**Contains**:
- REST controllers
- WebSocket gateways

Controllers:
- Validate input
- Call application use cases
- Never contain business logic

---

## 6. Mapping Stack Components to DDD

### API Server
- Lives in Interface layer
- Calls Application layer

### Realtime Server
- WebSocket gateways
- Uses same Application layer as REST

### Matchmaking Worker
- Background process
- Part of Application layer

### Bot Engine Adapter
- Infrastructure layer
- Implements BotEngine interface

---

## 7. Engine Integration (DDD-Safe)

### Engine Isolation Principle

The draughts engine:
- Does not know game rules
- Does not access database
- Does not communicate with clients

It only calculates moves.

---

### Engine Interface

```text
BotEngine
 ├── setPosition(board)
 ├── getMove(difficulty)
```

The Application layer depends on this interface.

---

### Player vs Computer Flow

```text
Client Move
 → Application Use Case
 → Game Domain validation
 → Board update
 → BotEngineAdapter
 → Engine calculates move
 → Game Domain validation
 → Persist & broadcast
```

This ensures server authority and fair play.

---

## 8. Bot Difficulty Model

Difficulty is modeled as data, not engine logic.

Attributes:
- Target rating
- Search depth
- Randomness
- Thinking time

This allows one engine to simulate many player strengths.

---

## 9. Persistence Strategy (DDD-Aligned)

### Domain
- Defines repository interfaces

### Infrastructure
- Implements repositories using ORM

### Data Stored
- Games
- Moves
- Results
- Ratings
- Bot difficulty used

---

## 10. Why This Foundation Is Strong

- Clean separation of concerns
- Easy onboarding for developers
- Safe engine integration
- Multiplayer-ready
- No rewrite required when scaling

---

## 11. Implementation Order (Critical)

1. Game domain rules
2. Bot engine adapter
3. Play vs computer
4. Realtime gameplay
5. Player vs player
6. Ratings

---

## 12. Conclusion

This stack and DDD integration:
- Matches chess.com design philosophy
- Fits Tanzania Drafti perfectly
- Is simple enough for MVP
- Is strong enough for long-term growth

---

**This document defines the technical foundation of Drafti.**

