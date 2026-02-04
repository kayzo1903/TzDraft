# TzDraft Backend

Tanzania Drafti (8×8) online gaming platform backend built with NestJS and Domain-Driven Design (DDD).

## 🎯 Project Overview

TzDraft is a chess.com-inspired platform for playing Tanzania Drafti online. Features include:

- **Player vs Player (PvP)** - Real-time multiplayer gameplay
- **Player vs Computer (PvE)** - 7 AI difficulty levels (350-2500 ELO)
- **Real-time synchronization** via WebSockets
- **Server-authoritative gameplay** with full move validation
- **ELO rating system**
- **Game history and replay**

## 🏗️ Architecture

This project follows **Domain-Driven Design (DDD)** principles with a modular monolith architecture:

```
src/
├── domain/              # Pure business logic (framework-independent)
│   ├── game/           # Core game domain
│   └── user/           # User identity domain
├── application/         # Use cases and orchestration
├── infrastructure/      # Technical implementations (DB, WebSocket, Engine)
├── interface/          # Entry points (REST API, WebSocket gateways)
└── shared/             # Cross-cutting concerns
```

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Real-time**: Socket.IO
- **Authentication**: JWT + bcrypt
- **Engine**: CAKE (8×8 draughts engine)

## 📦 Installation

```bash
# Install dependencies
c

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

## 🗄️ Database Setup

1. Install PostgreSQL
2. Create database:

```sql
CREATE DATABASE tzdraft;
```

3. Update `.env` with your database URL:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/tzdraft?schema=public"
```

4. Run migrations:

```bash
npx prisma migrate dev
```

## 🚀 Development

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Run tests
npm run test

# Run tests with coverage
npm run test:cov
```

## 📚 API Documentation

Once the server is running, API documentation is available at:

- Swagger UI: `http://localhost:3000/api/docs` (coming soon)

## 🎮 Game Rules

Tanzania Drafti (8×8) follows these core rules:

- **Board**: 8×8 with 32 playable dark squares
- **Pieces**: 12 per player (Men and Kings)
- **Movement**: Diagonal only
- **Captures**: Mandatory when available
- **Promotion**: Men become Kings on opponent's back row
- **Victory**: Eliminate all opponent pieces or block all legal moves

For detailed rules, see [docs/formal_tanzania_drafti_rule_specification_8_8.md](../docs/formal_tanzania_drafti_rule_specification_8_8.md)

## 🤖 AI Difficulty Levels

| Level    | ELO Rating | Search Depth | Randomness  |
| -------- | ---------- | ------------ | ----------- |
| Beginner | 350        | 1            | High        |
| Easy     | 750        | 3            | Medium-High |
| Medium   | 1000       | 5            | Medium      |
| Normal   | 1200       | 7            | Low         |
| Strong   | 1500       | 9            | Very Low    |
| Expert   | 2000       | 12           | None        |
| Master   | 2500       | 16+          | None        |

## 📁 Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── domain/                # Domain layer (business logic)
│   │   ├── game/
│   │   │   ├── entities/      # Game, Move entities
│   │   │   ├── value-objects/ # Position, Piece, BoardState
│   │   │   ├── services/      # Domain services
│   │   │   └── rules/         # Game rules
│   │   └── user/
│   ├── application/           # Application layer (use cases)
│   ├── infrastructure/        # Infrastructure layer
│   │   ├── database/          # Prisma, repositories
│   │   ├── websocket/         # WebSocket gateways
│   │   └── engines/           # CAKE engine adapter
│   ├── interface/             # Interface layer (controllers)
│   └── shared/                # Shared utilities
├── test/                      # Tests
└── package.json
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 Development Status

### ✅ Completed

- [x] Project setup and DDD structure
- [x] Prisma schema and database models
- [x] Domain value objects (Position, Piece, BoardState)
- [x] Domain entities (Game, Move)
- [x] Environment configuration

### 🚧 In Progress

- [ ] Move validation service
- [ ] Capture finding algorithm
- [ ] Game repositories
- [ ] REST API endpoints
- [ ] WebSocket real-time layer

### 📋 Planned

- [ ] CAKE engine integration
- [ ] User authentication (JWT)
- [ ] Matchmaking system
- [ ] ELO rating system
- [ ] Game history and replay

## 🤝 Contributing

This project follows strict DDD principles:

1. **Domain layer** must have NO framework dependencies
2. **Infrastructure** depends on domain, never the reverse
3. All game logic is **server-authoritative**
4. Moves are **immutable** and append-only

## 📄 License

MIT

## 🔗 Related Documentation

- [Implementation Plan](../tasks/implementation_plan.md)
- [Task List](../tasks/task.md)
- [Game Rules](../docs/formal_tanzania_drafti_rule_specification_8_8.md)
- [Technology Stack](../docs/drafti_technology_stack_ddd_integration.md)
