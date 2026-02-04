# TzDraft - Implementation Plan

## Project Overview

**TzDraft** is an online Tanzania Drafti (8×8) gaming platform inspired by chess.com's architecture. The platform will support:

- **Player vs Player (PvP)** real-time gameplay
- **Player vs Computer (PvE)** with 7 difficulty levels (350-2500 rating)
- **Real-time synchronization** via WebSockets
- **Server-authoritative gameplay** with full move validation
- **ELO/ILO rating system**
- **Game history and replay functionality**

---

## Technology Stack

### Backend

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Framework**: NestJS (Modular Monolith + DDD)
- **Architecture**: Domain-Driven Design (DDD)

### Database & Persistence

- **Database**: PostgreSQL
- **ORM**: Prisma
- **Migration Strategy**: Prisma Migrate

### Real-Time Communication

- **Protocol**: WebSockets
- **Library**: Socket.IO (for reconnection handling and room management)

### Draughts Engine

- **Engine**: CAKE (free, open-source 8×8 draughts engine)
- **Integration**: CLI process via adapter pattern
- **Difficulty Control**: Search depth + randomness injection

### Authentication

- **Strategy**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Session Management**: In-memory (MVP) → Redis (production)

### Testing

- **Unit Tests**: Jest
- **Integration Tests**: Jest + Supertest
- **E2E Tests**: Jest + Socket.IO client

---

## Architecture Overview

### DDD Layer Structure

```
src/
├── domain/              # Pure business logic (no framework dependencies)
│   ├── game/           # Core game domain
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── services/
│   │   └── rules/
│   └── user/           # User identity domain
│       ├── entities/
│       └── value-objects/
│
├── application/         # Use cases and orchestration
│   ├── commands/
│   ├── handlers/
│   └── dtos/
│
├── infrastructure/      # Technical implementations
│   ├── database/
│   │   ├── prisma/
│   │   └── repositories/
│   ├── websocket/
│   │   └── gateways/
│   └── engines/
│       └── cake-adapter/
│
├── interface/          # Entry points
│   ├── controllers/    # REST API
│   └── gateways/       # WebSocket
│
└── shared/             # Cross-cutting concerns
    ├── constants/
    ├── utils/
    └── types/
```

### Key Architectural Principles

1. **Server Authority**: All game logic executes server-side; clients are display-only
2. **Domain Purity**: Domain layer has zero framework dependencies
3. **Dependency Inversion**: Infrastructure depends on domain, not vice versa
4. **Immutable Move History**: Moves are append-only for replay capability
5. **Engine Isolation**: CAKE engine validates through same rules as human players

---

## Database Schema

### Core Tables

#### `users`

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  displayName  String
  passwordHash String
  createdAt    DateTime @default(now())

  gamesAsWhite Game[]   @relation("WhitePlayer")
  gamesAsBlack Game[]   @relation("BlackPlayer")
  rating       Rating?
}
```

#### `games` (Aggregate Root)

```prisma
model Game {
  id              String      @id @default(uuid())
  status          GameStatus  @default(WAITING)
  gameType        GameType
  ruleVersion     String      @default("TZ-8x8-v1")

  whitePlayerId   String
  blackPlayerId   String?
  whitePlayer     User        @relation("WhitePlayer", fields: [whitePlayerId])
  blackPlayer     User?       @relation("BlackPlayer", fields: [blackPlayerId])

  whiteElo        Int?
  blackElo        Int?
  aiLevel         Int?

  winner          Winner?
  endReason       EndReason?

  createdAt       DateTime    @default(now())
  startedAt       DateTime?
  endedAt         DateTime?

  moves           Move[]
  clock           Clock?
}

enum GameStatus { WAITING, ACTIVE, FINISHED, ABORTED }
enum GameType { RANKED, CASUAL, AI }
enum Winner { WHITE, BLACK, DRAW }
enum EndReason { CHECKMATE, RESIGN, TIME, DISCONNECT, DRAW }
```

#### `moves` (Immutable)

```prisma
model Move {
  id               String   @id @default(uuid())
  gameId           String
  game             Game     @relation(fields: [gameId])

  moveNumber       Int
  player           Player

  fromSquare       Int      // 1-32 (dark squares only)
  toSquare         Int
  capturedSquares  Int[]    // Ordered list for multi-capture

  isPromotion      Boolean  @default(false)
  isMultiCapture   Boolean  @default(false)

  notation         String   // e.g., "22x17x10"
  engineEval       Int?     // Centipawn equivalent

  createdAt        DateTime @default(now())

  @@unique([gameId, moveNumber])
}

enum Player { WHITE, BLACK }
```

#### `clocks`

```prisma
model Clock {
  gameId       String   @id
  game         Game     @relation(fields: [gameId])

  whiteTimeMs  BigInt
  blackTimeMs  BigInt
  lastMoveAt   DateTime
}
```

#### `ratings`

```prisma
model Rating {
  userId       String   @id
  user         User     @relation(fields: [userId])

  rating       Int      @default(1200)
  gamesPlayed  Int      @default(0)
  lastUpdated  DateTime @updatedAt
}
```

---

## Critical Implementation Details

### 1. Move Validation Algorithm

**Server-side validation pipeline:**

```typescript
// Pseudocode
function validateMove(game: Game, moveRequest: MoveRequest): ValidatedMove {
  // 1. Game state checks
  if (game.status !== "ACTIVE") throw InvalidGameStateError;

  // 2. Turn validation
  if (moveRequest.player !== game.currentTurn) throw InvalidTurnError;

  // 3. Piece ownership
  const piece = game.board.getPieceAt(moveRequest.from);
  if (!piece || piece.color !== moveRequest.player) throw InvalidPieceError;

  // 4. Detect all available captures
  const captures = captureFindingService.findAllCaptures(
    game.board,
    moveRequest.player,
  );

  // 5. Enforce mandatory capture
  if (captures.length > 0 && !moveRequest.isCapture) {
    throw CaptureRequiredError;
  }

  // 6. Validate capture path (if capture move)
  if (moveRequest.isCapture) {
    validateCapturePath(moveRequest, captures);
  }

  // 7. Apply move atomically
  return applyMove(game, moveRequest);
}
```

### 2. CAKE Engine Integration

**Adapter pattern for engine isolation:**

```typescript
interface BotEngine {
  setPosition(board: BoardState): Promise<void>;
  getMove(difficulty: number): Promise<Move>;
  shutdown(): Promise<void>;
}

class CakeEngineAdapter implements BotEngine {
  private process: ChildProcess;

  async setPosition(board: BoardState): Promise<void> {
    // Translate Tanzania Drafti board → CAKE format
    const cakePosition = this.translateBoard(board);
    await this.sendCommand(`position ${cakePosition}`);
  }

  async getMove(difficulty: number): Promise<Move> {
    const depth = this.getSearchDepth(difficulty);
    const response = await this.sendCommand(`go depth ${depth}`);
    return this.parseEngineMove(response);
  }

  private getSearchDepth(rating: number): number {
    // 350 → depth 1, 2500 → depth 16+
    return Math.floor(rating / 200) + 1;
  }
}
```

### 3. WebSocket Real-Time Protocol

**Event flow:**

```typescript
// Client → Server
interface ClientEvents {
  JOIN_GAME: { gameId: string };
  MAKE_MOVE: { gameId: string; from: number; to: number; path?: number[] };
  RESIGN: { gameId: string };
  REQUEST_SYNC: { gameId: string };
}

// Server → Client
interface ServerEvents {
  GAME_STATE: { board: BoardState; moves: Move[]; clocks: Clock; turn: Player };
  MOVE_APPLIED: { move: Move; updatedBoard: BoardState; clocks: Clock };
  MOVE_REJECTED: { reason: string };
  GAME_ENDED: { winner: Winner; reason: EndReason };
}
```

**Gateway implementation:**

```typescript
@WebSocketGateway()
export class GameGateway {
  @SubscribeMessage("MAKE_MOVE")
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MakeMoveDto,
  ) {
    try {
      // 1. Validate move via use case
      const result = await this.makeMoveUseCase.execute(data);

      // 2. Broadcast to all players in game room
      this.server.to(`game:${data.gameId}`).emit("MOVE_APPLIED", result);

      // 3. If PvE, trigger bot move
      if (
        result.game.gameType === "AI" &&
        result.game.currentTurn === "BLACK"
      ) {
        const botMove = await this.getBotMoveUseCase.execute(data.gameId);
        this.server.to(`game:${data.gameId}`).emit("MOVE_APPLIED", botMove);
      }
    } catch (error) {
      client.emit("MOVE_REJECTED", { reason: error.message });
    }
  }
}
```

### 4. Clock System

**Server-authoritative timing:**

```typescript
class ClockService {
  updateClock(game: Game, clock: Clock): Clock {
    const now = Date.now();
    const elapsed = now - clock.lastMoveAt.getTime();

    // Deduct time from current player
    if (game.currentTurn === "WHITE") {
      clock.whiteTimeMs -= elapsed;
    } else {
      clock.blackTimeMs -= elapsed;
    }

    // Apply increment (if applicable)
    if (game.timeControlType === "INCREMENTAL") {
      clock[game.currentTurn.toLowerCase() + "TimeMs"] += game.incrementMs;
    }

    // Check timeout
    if (clock.whiteTimeMs <= 0 || clock.blackTimeMs <= 0) {
      this.endGameByTimeout(game);
    }

    clock.lastMoveAt = new Date(now);
    return clock;
  }
}
```

---

## Development Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Set up project infrastructure and domain layer

**Deliverables**:

- ✅ NestJS project initialized with DDD structure
- ✅ PostgreSQL + Prisma configured
- ✅ Domain entities and value objects created
- ✅ Core Tanzania Drafti rules implemented
- ✅ Move validation service with unit tests

**Critical Path**:

1. Initialize NestJS project
2. Create DDD folder structure
3. Implement domain entities (Game, Board, Piece, Move)
4. Implement move validation algorithm
5. Write comprehensive unit tests (>90% coverage)

---

### Phase 2: Database & Repositories (Week 2-3)

**Goal**: Implement persistence layer

**Deliverables**:

- ✅ Prisma schema defined
- ✅ Database migrations created
- ✅ Repositories implemented (Game, Move, User)
- ✅ Integration tests for repositories

**Critical Path**:

1. Define Prisma schema
2. Create initial migration
3. Implement GameRepository
4. Implement MoveRepository
5. Test repository operations

---

### Phase 3: Application Layer & Use Cases (Week 3-4)

**Goal**: Implement business workflows

**Deliverables**:

- ✅ CreateGameUseCase
- ✅ MakeMoveUseCase (with full validation)
- ✅ ResignGameUseCase
- ✅ GetGameStateUseCase
- ✅ Use case tests

**Critical Path**:

1. Implement game creation logic
2. Implement move processing pipeline
3. Integrate clock updates with moves
4. Test complete game flows

---

### Phase 4: CAKE Engine Integration (Week 4-5)

**Goal**: Enable Player vs Computer gameplay

**Deliverables**:

- ✅ CakeEngineAdapter implemented
- ✅ Board translation logic (Tanzania Drafti ↔ CAKE)
- ✅ 7 difficulty levels configured
- ✅ PlayVsBotUseCase
- ✅ Engine integration tests

**Critical Path**:

1. Research CAKE CLI interface
2. Implement engine adapter
3. Implement board state translation
4. Configure difficulty levels
5. Test bot moves against validation rules

---

### Phase 5: REST API (Week 5-6)

**Goal**: Expose HTTP endpoints

**Deliverables**:

- ✅ GameController (CRUD operations)
- ✅ UserController (auth endpoints)
- ✅ Swagger documentation
- ✅ API integration tests

**Critical Path**:

1. Create REST controllers
2. Implement JWT authentication
3. Add Swagger documentation
4. Test all endpoints

---

### Phase 6: WebSocket Real-Time Layer (Week 6-7)

**Goal**: Enable live gameplay

**Deliverables**:

- ✅ GameGateway implemented
- ✅ Real-time move broadcasting
- ✅ Reconnection handling
- ✅ WebSocket integration tests

**Critical Path**:

1. Set up Socket.IO
2. Implement game channels
3. Implement event handlers (JOIN_GAME, MAKE_MOVE, etc.)
4. Implement reconnection logic
5. Test real-time scenarios

---

### Phase 7: Matchmaking & Rating (Week 7-8)

**Goal**: Enable player matching and rankings

**Deliverables**:

- ✅ Simple PvP matchmaking queue
- ✅ Instant PvE game creation
- ✅ ELO rating calculation
- ✅ Leaderboard queries

**Critical Path**:

1. Implement matchmaking service
2. Implement rating calculation
3. Update ratings after games
4. Create leaderboard endpoints

---

### Phase 8: Testing & Quality Assurance (Week 8-9)

**Goal**: Ensure production readiness

**Deliverables**:

- ✅ >90% unit test coverage
- ✅ Integration tests for all critical paths
- ✅ E2E tests for complete game flows
- ✅ Load testing results

**Critical Path**:

1. Achieve test coverage targets
2. Run E2E test suite
3. Perform load testing
4. Fix identified bugs

---

### Phase 9: Deployment (Week 9-10)

**Goal**: Deploy to production

**Deliverables**:

- ✅ Docker containerization
- ✅ CI/CD pipeline
- ✅ Production deployment
- ✅ Monitoring and logging

**Critical Path**:

1. Create Dockerfile and docker-compose
2. Set up CI/CD (GitHub Actions)
3. Deploy to cloud platform (AWS/GCP/Azure)
4. Configure monitoring (Prometheus/Grafana)

---

## Recommended Development Order

### Critical Path (Must Complete First)

1. **Domain Layer** → Core game rules and validation
2. **Database Schema** → Persistence foundation
3. **Application Layer** → Use cases and orchestration
4. **CAKE Engine** → Bot gameplay capability

### Parallel Development (Can Work Simultaneously)

- **REST API** + **WebSocket Layer** (different developers)
- **Authentication** + **Rating System** (different developers)
- **Testing** (continuous throughout)

### Final Integration

1. **Matchmaking** (requires all previous components)
2. **E2E Testing** (validates complete system)
3. **Deployment** (final step)

---

## Risk Mitigation

### Technical Risks

| Risk                             | Mitigation                                             |
| -------------------------------- | ------------------------------------------------------ |
| CAKE engine compatibility issues | Test engine early; have fallback to random legal moves |
| WebSocket scalability            | Use Redis pub/sub for horizontal scaling               |
| Clock drift/desync               | Server-authoritative timing; frequent sync messages    |
| Database performance             | Add indexes; implement caching layer                   |
| Move validation bugs             | Comprehensive test suite; rule-derived test cases      |

### Development Risks

| Risk            | Mitigation                                                       |
| --------------- | ---------------------------------------------------------------- |
| Scope creep     | Strict MVP feature list; defer spectator mode, chat, tournaments |
| Timeline delays | Prioritize critical path; parallel development where possible    |
| Testing gaps    | TDD approach; automated test coverage reporting                  |

---

## Success Criteria

### MVP Launch Requirements

- ✅ Player can create account and login
- ✅ Player can start game vs computer (7 difficulty levels)
- ✅ Player can play complete game vs computer with real-time updates
- ✅ Player can play complete game vs another player
- ✅ All Tanzania Drafti rules correctly enforced
- ✅ Time controls work accurately
- ✅ Ratings update after games
- ✅ Game history viewable
- ✅ >90% test coverage
- ✅ <100ms move validation latency
- ✅ Supports 100+ concurrent games

---

## Post-MVP Roadmap

### Version 1.1 (Future)

- Spectator mode
- In-game chat
- Game analysis with engine evaluation
- Opening book integration

### Version 1.2 (Future)

- Tournaments
- Puzzles/Tactics trainer
- Mobile app (React Native)
- Social features (friends, challenges)

### Version 2.0 (Future)

- Microservices architecture
- Horizontal scaling
- Advanced anti-cheat
- Streaming integration

---

## Conclusion

This implementation plan provides a **clear, executable roadmap** for building TzDraft from scratch to production deployment. The architecture is:

- ✅ **Production-ready**: Inspired by chess.com's proven design
- ✅ **Scalable**: Clean DDD structure allows future growth
- ✅ **Testable**: Domain purity enables comprehensive testing
- ✅ **Maintainable**: Clear separation of concerns
- ✅ **MVP-focused**: Delivers core value quickly

**Estimated Timeline**: 9-10 weeks for MVP with 2-3 developers

**Next Steps**: Begin Phase 1 - Foundation
