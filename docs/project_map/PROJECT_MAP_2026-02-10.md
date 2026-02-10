# 🗺️ TzDraft Project Map

**Tanzania Drafti (8×8) Online Gaming Platform**  
_Chess.com-inspired platform for playing Tanzania Drafti online_

---

## 📊 Project Overview

```
TzDraft/
├── 🎮 Backend (NestJS + Clean Architecture/DDD)
├── 🖥️ Frontend (Next.js 16 + React 19)
├── 📚 Documentation (16 specification files)
├── 📋 Tasks (Implementation plan + task tracking)
└── 🔧 Configuration files
```

**Status:** 🟡 In Active Development  
**Architecture:** Clean Architecture + Domain-Driven Design (DDD)  
**Servers Running:**

- Backend: `http://localhost:3002` (NestJS)
- Frontend: `http://localhost:3000` (Next.js)

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                      │
│                      Port 3000 (pnpm dev)                       │
├─────────────────────────────────────────────────────────────────┤
│  • Next.js 16 (App Router)                                      │
│  • React 19                                                     │
│  • Better Auth Client (useSession hook)                        │
│  • Socket.IO Client (real-time game sync)                      │
│  • Tailwind CSS 4                                               │
│  • next-intl (i18n support)                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                         │
│                   Port 3002 (npm run start:dev)                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  INTERFACE LAYER (Entry Points)                          │  │
│  │  • REST API Controllers (Game, Move)                     │  │
│  │  • WebSocket Gateway (Real-time sync)                    │  │
│  │  • Better Auth Controller (Proxy to Better Auth)        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  APPLICATION LAYER (Use Cases)                           │  │
│  │  • CreateGameUseCase                                     │  │
│  │  • MakeMoveUseCase                                       │  │
│  │  • GetGameStateUseCase                                   │  │
│  │  • GetLegalMovesUseCase                                  │  │
│  │  • EndGameUseCase                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  DOMAIN LAYER (Business Logic - Framework Independent)   │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │  GAME DOMAIN                                        │ │  │
│  │  │  • Entities: Game, Move                             │ │  │
│  │  │  • Value Objects: BoardState, Piece, Position       │ │  │
│  │  │  • Services:                                        │ │  │
│  │  │    - GameRulesService (rule enforcement)            │ │  │
│  │  │    - MoveValidationService (move legality)          │ │  │
│  │  │    - CaptureFindingService (capture detection)      │ │  │
│  │  │    - MoveGeneratorService (legal move generation)   │ │  │
│  │  │  • Types: CapturePathType, MoveResultType          │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │  USER DOMAIN                                        │ │  │
│  │  │  • Entities: User                                   │ │  │
│  │  │  • Value Objects: (TBD)                             │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  INFRASTRUCTURE LAYER (Technical Implementations)        │  │
│  │  • Database: Prisma + PostgreSQL                        │  │
│  │  • Repositories: PrismaGameRepository, PrismaMoveRepo   │  │
│  │  • WebSocket: Socket.IO (GamesGateway)                  │  │
│  │  • Auth: Better Auth (session-based)                    │  │
│  │  • Engine: CAKE (8×8 draughts engine) - Planned        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                        │
│                         Supabase Hosted                         │
├─────────────────────────────────────────────────────────────────┤
│  • Users, Sessions, Accounts, Verification (Better Auth)        │
│  • Games, Moves, Clocks (Game Domain)                          │
│  • Ratings (ELO System)                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Detailed File Structure

### Backend Structure

```
backend/
├── 📄 Configuration Files
│   ├── .env                          # Environment variables (DB, Auth, OAuth)
│   ├── package.json                  # Dependencies (NestJS, Prisma, Socket.IO)
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── nest-cli.json                 # NestJS CLI configuration
│   └── eslint.config.mjs             # ESLint configuration
│
├── 🗄️ prisma/
│   ├── schema.prisma                 # Main schema (imports from schema/)
│   └── schema/                       # Modular schema files
│       ├── base.prisma               # Base configuration
│       ├── user.prisma               # User, Session, Account, Verification
│       ├── game.prisma               # Game entity + enums
│       ├── move.prisma               # Move entity
│       └── clock.prisma              # Clock entity (time control)
│
├── 🧪 test/
│   └── jest-e2e.json                 # E2E test configuration
│
├── 📜 scripts/
│   └── merge-schemas.js              # Merges modular Prisma schemas
│
└── 📦 src/
    ├── main.ts                       # Application entry point
    ├── app.module.ts                 # Root module
    │
    ├── 🎯 domain/                    # DOMAIN LAYER (Pure Business Logic)
    │   ├── game/
    │   │   ├── entities/
    │   │   │   ├── game.entity.ts    # Game aggregate root
    │   │   │   └── move.entity.ts    # Move entity (immutable)
    │   │   ├── value-objects/
    │   │   │   ├── board-state.vo.ts # Board representation (32 squares)
    │   │   │   ├── piece.vo.ts       # Piece (type, color, position)
    │   │   │   └── position.vo.ts    # Position (1-32 dark squares)
    │   │   ├── services/
    │   │   │   ├── game-rules.service.ts        # Rule enforcement
    │   │   │   ├── move-validation.service.ts   # Move legality checks
    │   │   │   ├── capture-finding.service.ts   # Capture detection
    │   │   │   ├── move-generator.service.ts    # Legal move generation
    │   │   │   └── index.ts
    │   │   ├── types/
    │   │   │   ├── capture-path.type.ts         # Capture sequence type
    │   │   │   ├── move-result.type.ts          # Move execution result
    │   │   │   ├── validation-error.type.ts     # Validation errors
    │   │   │   └── index.ts
    │   │   └── repositories/
    │   │       ├── game.repository.interface.ts # Game repo contract
    │   │       └── move.repository.interface.ts # Move repo contract
    │   └── user/
    │       ├── entities/                        # User entities (TBD)
    │       └── value-objects/                   # User VOs (TBD)
    │
    ├── 🎬 application/               # APPLICATION LAYER (Use Cases)
    │   ├── use-cases/
    │   │   ├── create-game.use-case.ts          # Create new game
    │   │   ├── make-move.use-case.ts            # Execute move
    │   │   ├── get-game-state.use-case.ts       # Retrieve game state
    │   │   ├── get-legal-moves.use-case.ts      # Get valid moves
    │   │   ├── end-game.use-case.ts             # End game
    │   │   └── use-cases.module.ts
    │   ├── commands/                            # CQRS commands (TBD)
    │   ├── handlers/                            # Command handlers (TBD)
    │   └── dtos/                                # Application DTOs (TBD)
    │
    ├── 🏗️ infrastructure/            # INFRASTRUCTURE LAYER
    │   ├── database/
    │   │   └── prisma/
    │   │       ├── prisma.service.ts            # Prisma client wrapper
    │   │       └── prisma.module.ts
    │   ├── repositories/
    │   │   ├── prisma-game.repository.ts        # Game repo implementation
    │   │   ├── prisma-move.repository.ts        # Move repo implementation
    │   │   └── repository.module.ts
    │   └── messaging/
    │       ├── games.gateway.ts                 # WebSocket gateway
    │       └── messaging.module.ts
    │
    ├── 🌐 interface/                 # INTERFACE LAYER (Entry Points)
    │   └── http/
    │       ├── controllers/
    │       │   ├── game.controller.ts           # Game REST endpoints
    │       │   └── move.controller.ts           # Move REST endpoints
    │       ├── dtos/
    │       │   ├── create-game.dto.ts           # Create game DTO
    │       │   └── make-move.dto.ts             # Make move DTO
    │       └── http.module.ts
    │
    ├── 🔐 auth/
    │   └── (EMPTY - needs BetterAuthGuard)      # ⚠️ MISSING: Auth guards
    │
    ├── 📚 lib/                       # Shared libraries
    │
    └── 🔧 shared/                    # Cross-cutting concerns
        └── constants/
            └── game.constants.ts                # Game constants
```

### Frontend Structure

```
frontend/
├── 📄 Configuration Files
│   ├── .env                          # Environment variables
│   ├── package.json                  # Dependencies (Next.js, React, Socket.IO)
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── next.config.ts                # Next.js configuration
│   ├── tailwind.config.ts            # Tailwind CSS 4 configuration
│   └── postcss.config.mjs            # PostCSS configuration
│
├── 🌍 messages/                      # i18n translation files
│   ├── en.json                       # English translations
│   └── sw.json                       # Swahili translations
│
├── 🖼️ public/                        # Static assets
│   ├── images/                       # Images
│   └── icons/                        # Icons
│
└── 📦 src/
    ├── 🎨 app/                       # Next.js App Router
    │   ├── favicon.ico
    │   ├── icon.png
    │   ├── globals.css               # Global styles
    │   │
    │   └── [locale]/                 # Internationalized routes
    │       ├── layout.tsx            # Root layout
    │       ├── page.tsx              # Home page
    │       ├── loading.tsx           # Loading state
    │       │
    │       ├── auth/                 # Authentication pages
    │       │   ├── layout.tsx        # Auth layout (split-screen design)
    │       │   ├── login/
    │       │   │   └── page.tsx      # ✅ Login page (email + Google OAuth)
    │       │   ├── signup/
    │       │   │   └── page.tsx      # ✅ Signup page (with username)
    │       │   ├── forgot-password/
    │       │   │   └── page.tsx      # ✅ Forgot password page
    │       │   ├── reset-password/
    │       │   │   └── page.tsx      # ✅ Reset password page
    │       │   └── verify-email/
    │       │       └── page.tsx      # ⚠️ MISSING: Content component
    │       │
    │       ├── game/                 # Game pages (TBD)
    │       │   └── [id]/
    │       │       └── page.tsx      # ⚠️ MISSING: Game page
    │       │
    │       └── support/
    │           └── page.tsx          # Support page
    │
    │   └── api/                      # API routes
    │       └── auth/
    │           └── [...all]/         # ⚠️ EMPTY: Better Auth route handler
    │
    ├── 🧩 components/                # React components
    │   ├── auth/
    │   │   └── GoogleAuthButton.tsx  # ✅ Google OAuth button
    │   ├── game/
    │   │   ├── Board.tsx             # Game board component
    │   │   └── Piece.tsx             # Game piece component
    │   ├── hero/
    │   │   └── HeroBoard.tsx         # Hero section board
    │   ├── layout/
    │   │   └── Navbar.tsx            # Navigation bar
    │   └── ui/
    │       ├── Button.tsx            # Button component
    │       └── LoadingScreen.tsx     # Loading screen
    │
    ├── 🪝 hooks/
    │   └── useSocket.ts              # Socket.IO hook
    │
    ├── 🌐 i18n/
    │   ├── request.ts                # i18n request handler
    │   └── routing.ts                # i18n routing configuration
    │
    ├── 🔧 services/
    │   └── socket.service.ts         # Socket.IO service
    │
    ├── 📚 lib/
    │   └── auth-client.ts            # ✅ Better Auth client (NOT USED YET)
    │
    └── proxy.ts                      # Proxy configuration
```

---

## 🗄️ Database Schema

### Better Auth Tables (Authentication)

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  displayName  String   @map("display_name")
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now())

  sessions     Session[]
  accounts     Account[]
  gamesAsWhite Game[]  @relation("WhitePlayer")
  gamesAsBlack Game[]  @relation("BlackPlayer")
  rating       Rating?
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  token     String   @unique
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
}

model Account {
  id           String   @id
  userId       String
  accountId    String
  providerId   String   # "credential" or "google"
  accessToken  String?
  refreshToken String?
  idToken      String?
  expiresAt    DateTime?
  password     String?
  user         User     @relation(fields: [userId], references: [id])
}

model Verification {
  id         String   @id
  identifier String   # email
  value      String   # verification token
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}
```

### Game Domain Tables

```prisma
model Game {
  id            String     @id @default(uuid())
  status        GameStatus @default(WAITING)
  gameType      GameType   @map("game_type")
  ruleVersion   String     @default("TZ-8x8-v1")

  whitePlayerId String
  blackPlayerId String?
  whitePlayer   User    @relation("WhitePlayer", fields: [whitePlayerId], references: [id])
  blackPlayer   User?   @relation("BlackPlayer", fields: [blackPlayerId], references: [id])

  whiteElo      Int?
  blackElo      Int?
  aiLevel       Int?
  currentTurn   PlayerColor @default(WHITE)

  winner        Winner?
  endReason     EndReason?

  createdAt     DateTime  @default(now())
  startedAt     DateTime?
  endedAt       DateTime?

  moves         Move[]
  clock         Clock?
}

model Move {
  id              String   @id @default(uuid())
  gameId          String
  game            Game     @relation(fields: [gameId], references: [id])

  moveNumber      Int
  player          Player
  fromSquare      Int      # 1-32
  toSquare        Int      # 1-32
  capturedSquares Int[]    # Multi-capture support

  isPromotion     Boolean  @default(false)
  isMultiCapture  Boolean  @default(false)
  notation        String   # e.g., "22x17x10"
  engineEval      Int?     # Centipawn equivalent

  createdAt       DateTime @default(now())

  @@unique([gameId, moveNumber])
}

model Clock {
  gameId      String   @id
  game        Game     @relation(fields: [gameId], references: [id])
  whiteTimeMs BigInt
  blackTimeMs BigInt
  lastMoveAt  DateTime
}

model Rating {
  userId      String   @id
  user        User     @relation(fields: [userId], references: [id])
  rating      Int      @default(1200)
  gamesPlayed Int      @default(0)
  lastUpdated DateTime @updatedAt
}
```

### Enums

```prisma
enum GameStatus { WAITING, ACTIVE, FINISHED, ABORTED }
enum GameType { RANKED, CASUAL, AI }
enum PlayerColor { WHITE, BLACK }
enum Player { WHITE, BLACK }
enum Winner { WHITE, BLACK, DRAW }
enum EndReason { CHECKMATE, RESIGN, TIME, DISCONNECT, DRAW }
```

---

## 🛠️ Technology Stack

### Backend

| Category       | Technology      | Version | Purpose                        |
| -------------- | --------------- | ------- | ------------------------------ |
| **Runtime**    | Node.js         | Latest  | JavaScript runtime             |
| **Language**   | TypeScript      | 5.7.3   | Type-safe development          |
| **Framework**  | NestJS          | 11.0.1  | Backend framework              |
| **Database**   | PostgreSQL      | Latest  | Relational database (Supabase) |
| **ORM**        | Prisma          | 5.22.0  | Database toolkit               |
| **Real-time**  | Socket.IO       | 4.8.3   | WebSocket communication        |
| **Auth**       | Better Auth     | Latest  | Authentication library         |
| **Password**   | bcrypt          | 6.0.0   | Password hashing               |
| **Validation** | class-validator | 0.14.3  | DTO validation                 |
| **Testing**    | Jest            | 30.0.0  | Unit/E2E testing               |
| **API Docs**   | Swagger         | 11.2.5  | API documentation              |

### Frontend

| Category       | Technology           | Version | Purpose                   |
| -------------- | -------------------- | ------- | ------------------------- |
| **Framework**  | Next.js              | 16.1.6  | React framework           |
| **UI Library** | React                | 19.2.3  | UI components             |
| **Language**   | TypeScript           | 5.x     | Type-safe development     |
| **Styling**    | Tailwind CSS         | 4.x     | Utility-first CSS         |
| **i18n**       | next-intl            | 4.8.2   | Internationalization      |
| **Real-time**  | Socket.IO Client     | 4.8.3   | WebSocket client          |
| **Auth**       | Better Auth React    | Latest  | Auth hooks (NOT USED YET) |
| **Utils**      | clsx, tailwind-merge | Latest  | Class name utilities      |

---

## 🔐 Authentication System Status

### ✅ What's Working

1. **Backend**
   - ✅ Better Auth configuration
   - ✅ Auth controller (proxies to Better Auth)
   - ✅ Database schema (User, Session, Account, Verification)
   - ✅ Google OAuth setup
   - ✅ Email verification (Resend integration)
   - ✅ Password reset flow

2. **Frontend**
   - ✅ Auth client configured
   - ✅ Login page (email + Google OAuth)
   - ✅ Signup page (with username)
   - ✅ Forgot password page
   - ✅ Reset password page
   - ✅ Auth layout (beautiful split-screen design)
   - ✅ Google OAuth button component

### 🚨 Critical Missing Components

1. **Backend Guards** (🔴 Critical)
   - ❌ No `BetterAuthGuard` implementation
   - ❌ Game controllers are NOT protected
   - ❌ Anyone can call APIs without authentication

2. **Frontend Middleware** (🔴 Critical)
   - ❌ No `middleware.ts` for route protection
   - ❌ Anyone can access game pages without login

3. **Session Usage** (🔴 Critical)
   - ❌ `useSession` hook is never used in pages
   - ❌ App doesn't know if user is logged in

4. **User Initialization** (🟡 High Priority)
   - ❌ No automatic `Rating` record creation on signup
   - ❌ Can cause errors when user tries to play

5. **Verify Email Component** (🟡 High Priority)
   - ❌ Verify email page references non-existent component

**Estimated completion time: 3-4 hours**

---

## 📚 Documentation Files

Located in `docs/README/`:

1. **Architecture & Design**
   - `NESTJS_DDD_folder_structure.md` - DDD folder structure
   - `drafti_technology_stack_ddd_integration.md` - Tech stack overview
   - `drafti_game_domain_class_diagram_8_8_tanzania_drafti.md` - Domain class diagram

2. **Game Rules & Mechanics**
   - `formal_tanzania_drafti_rule_specification_8_8.md` - Official game rules
   - `drafti_official_game_policy.md` - Game policies
   - `drafti_clock_and_time_control_mechanics.md` - Time control system

3. **Algorithms & Implementation**
   - `drafti_move_validation_algorithm_exact_steps.md` - Move validation
   - `drafti_optimized_capture_finding_algorithm.md` - Capture detection
   - `drafti_engine_based_architecture_8_x_8_tanzania_drafti.md` - Engine architecture
   - `drafti_engine_move_translation_spec_cake_↔_8_8_tanzania_drafti.md` - Engine translation

4. **Database & API**
   - `drafti_database_schema_for_games_moves.md` - Database design
   - `drafti_realtime_sync_protocol_web_socket_flow.md` - WebSocket protocol

5. **Frontend & Testing**
   - `drafti_frontend_plan_chess.md` - Frontend architecture
   - `drafti_rule_derived_test_cases.md` - Test cases

6. **Project Management**
   - `drafti_project_overview.md` - Project overview
   - `drafti_policy_and_privacy_guidelines.md` - Policies

---

## 📋 Development Status

### ✅ Completed Features

**Backend:**

- ✅ Clean Architecture/DDD structure
- ✅ Prisma schema (modular design)
- ✅ Domain entities (Game, Move)
- ✅ Domain value objects (BoardState, Piece, Position)
- ✅ Domain services (GameRules, MoveValidation, CaptureFinding, MoveGenerator)
- ✅ Use cases (CreateGame, MakeMove, GetGameState, GetLegalMoves, EndGame)
- ✅ Repositories (PrismaGameRepository, PrismaMoveRepository)
- ✅ REST API controllers (Game, Move)
- ✅ WebSocket gateway (GamesGateway)
- ✅ Better Auth integration
- ✅ Database migrations

**Frontend:**

- ✅ Next.js 16 setup (App Router)
- ✅ Tailwind CSS 4 configuration
- ✅ i18n support (English, Swahili)
- ✅ Auth pages (login, signup, forgot password, reset password)
- ✅ Auth layout (split-screen design)
- ✅ Google OAuth button
- ✅ Game components (Board, Piece)
- ✅ Socket.IO client setup

### 🚧 In Progress

**Backend:**

- 🚧 Auth guards implementation
- 🚧 User initialization hook
- 🚧 CAKE engine integration

**Frontend:**

- 🚧 Route protection middleware
- 🚧 Session management in pages
- 🚧 Verify email component
- 🚧 Game page implementation

### 📋 Planned Features

**Backend:**

- 📋 Matchmaking system
- 📋 ELO rating calculation
- 📋 Game history and replay
- 📋 AI opponent (7 difficulty levels)
- 📋 Tournament system
- 📋 Admin panel

**Frontend:**

- 📋 Game lobby
- 📋 Player profiles
- 📋 Leaderboards
- 📋 Game analysis
- 📋 Mobile responsive design
- 📋 Dark mode

---

## 🚀 Quick Start Commands

### Backend

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run start:dev

# Run tests
npm run test

# Run E2E tests
npm run test:e2e
```

### Frontend

```bash
# Navigate to frontend
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

---

## 🔗 Important Links

- **Backend README:** backend/README.md
- **Frontend README:** frontend/README.md
- **Implementation Plan:** tasks/implementation_plan.md
- **Task List:** tasks/task.md

---

## 🎯 Next Steps

Based on the current state, here are the recommended next steps:

### Phase 1: Complete Authentication (3-4 hours)

1. Create `BetterAuthGuard` for backend route protection
2. Apply guards to game controllers
3. Create frontend middleware for route protection
4. Implement session checks in frontend pages
5. Create user initialization hook for Rating records
6. Build verify-email-content component

### Phase 2: Game Implementation (1-2 weeks)

1. Build game page with board rendering
2. Implement move input and validation
3. Add real-time synchronization
4. Test full game flow (create → play → end)

### Phase 3: Advanced Features (2-4 weeks)

1. Integrate CAKE engine for AI opponents
2. Implement matchmaking system
3. Add ELO rating calculation
4. Build game history and replay
5. Create leaderboards

---

## 📊 Project Statistics

- **Total Backend Files:** 37 TypeScript files
- **Total Frontend Files:** 20 TypeScript/TSX files
- **Documentation Files:** 16 markdown files
- **Database Tables:** 9 tables (User, Session, Account, Verification, Game, Move, Clock, Rating)
- **API Endpoints:** ~10 REST endpoints + WebSocket events
- **Supported Languages:** English, Swahili
- **Authentication Methods:** Email/Password, Google OAuth

---

**Last Updated:** 2026-02-10  
**Project Status:** 🟡 Active Development (70% complete on auth, 40% complete overall)
