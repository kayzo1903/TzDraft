# TzDraft - Project Implementation Task List

## Phase 1: Project Setup & Foundation

- [ ] Initialize NestJS project with TypeScript
- [ ] Configure project structure following DDD architecture
- [ ] Set up PostgreSQL database
- [ ] Configure Prisma ORM
- [ ] Set up environment configuration
- [ ] Configure ESLint and Prettier
- [ ] Set up testing framework (Jest)
- [ ] Create basic project documentation

## Phase 2: Domain Layer - Game Rules & Logic

- [ ] **Game Domain Entities**
  - [ ] Create `Game` entity
  - [ ] Create `Player` entity
  - [ ] Create `Move` entity
  - [ ] Create `Board` entity
  - [ ] Create `Piece` entity
- [ ] **Value Objects**
  - [ ] Create `Square` value object
  - [ ] Create `Position` value object
  - [ ] Create `BoardState` value object
  - [ ] Create `PlayerColor` value object
- [ ] **Domain Services**
  - [ ] Implement `MoveValidationService` (Tanzania Drafti rules)
  - [ ] Implement `CaptureFindingService` (mandatory capture detection)
  - [ ] Implement `GameEndDetectionService`
  - [ ] Implement `PromotionService` (kinging logic)
- [ ] **Game Rules Implementation**
  - [ ] Implement Tanzania Drafti 8x8 rules
  - [ ] Implement Man movement rules
  - [ ] Implement King movement rules
  - [ ] Implement capture rules (mandatory, multi-capture)
  - [ ] Implement promotion rules
  - [ ] Write comprehensive unit tests for all rules

## Phase 3: Database Schema & Repositories

- [ ] **Prisma Schema Definition**
  - [ ] Define `users` table
  - [ ] Define `games` table (aggregate root)
  - [ ] Define `moves` table (immutable, append-only)
  - [ ] Define `clocks` table
  - [ ] Define `ratings` table
  - [ ] Set up relationships and constraints
- [ ] **Database Migrations**
  - [ ] Create initial migration
  - [ ] Test migration rollback
- [ ] **Repository Implementations**
  - [ ] Implement `GameRepository`
  - [ ] Implement `MoveRepository`
  - [ ] Implement `UserRepository`
  - [ ] Implement `RatingRepository`
  - [ ] Write repository integration tests

## Phase 4: Application Layer - Use Cases

- [ ] **Game Management Use Cases**
  - [ ] `CreateGameUseCase` (PvP and PvE)
  - [ ] `JoinGameUseCase`
  - [ ] `StartGameUseCase`
- [ ] **Gameplay Use Cases**
  - [ ] `MakeMoveUseCase` (with full validation)
  - [ ] `ResignGameUseCase`
  - [ ] `RequestDrawUseCase`
  - [ ] `AcceptDrawUseCase`
- [ ] **Bot Integration Use Cases**
  - [ ] `PlayVsBotUseCase`
  - [ ] `GetBotMoveUseCase`
- [ ] **Query Use Cases**
  - [ ] `GetGameStateUseCase`
  - [ ] `GetGameHistoryUseCase`
  - [ ] `GetPlayerStatsUseCase`
- [ ] **DTOs and Commands**
  - [ ] Create command DTOs
  - [ ] Create query DTOs
  - [ ] Create response DTOs

## Phase 5: CAKE Engine Integration

- [ ] **Engine Adapter Layer**
  - [ ] Research CAKE engine CLI interface
  - [ ] Create `BotEngine` interface
  - [ ] Implement `CakeEngineAdapter`
  - [ ] Implement board state translation (Tanzania Drafti ↔ CAKE)
  - [ ] Implement move notation translation
- [ ] **Difficulty Levels**
  - [ ] Configure 7 difficulty levels (350-2500 rating)
  - [ ] Implement search depth control
  - [ ] Implement randomness injection for lower levels
  - [ ] Test each difficulty level
- [ ] **Engine Process Management**
  - [ ] Implement engine process spawning
  - [ ] Implement engine communication protocol
  - [ ] Implement timeout handling
  - [ ] Implement error recovery

## Phase 6: Clock & Time Control System

- [ ] **Clock Domain Logic**
  - [ ] Implement clock calculation algorithms
  - [ ] Implement Standard time control
  - [ ] Implement Incremental time control
  - [ ] Implement Delay time control
- [ ] **Clock Integration**
  - [ ] Integrate clock updates with move processing
  - [ ] Implement timeout detection
  - [ ] Implement pause/resume on disconnect
  - [ ] Write clock accuracy tests

## Phase 7: User Authentication & Identity

- [ ] **User Module**
  - [ ] Create `User` entity
  - [ ] Implement user registration
  - [ ] Implement user login (JWT)
  - [ ] Implement password hashing (bcrypt)
  - [ ] Implement guest player support
- [ ] **Authorization**
  - [ ] Create authentication guards
  - [ ] Implement role-based access control
  - [ ] Create session management

## Phase 8: REST API Layer

- [ ] **Game Controller**
  - [ ] `POST /games` - Create game
  - [ ] `GET /games/:id` - Get game state
  - [ ] `POST /games/:id/join` - Join game
  - [ ] `GET /games/history` - Get player game history
- [ ] **User Controller**
  - [ ] `POST /auth/register` - Register user
  - [ ] `POST /auth/login` - Login user
  - [ ] `GET /users/profile` - Get user profile
  - [ ] `GET /users/stats` - Get user statistics
- [ ] **API Documentation**
  - [ ] Set up Swagger/OpenAPI
  - [ ] Document all endpoints
  - [ ] Add request/response examples

## Phase 9: WebSocket Real-Time Layer

- [ ] **WebSocket Gateway Setup**
  - [ ] Configure Socket.IO or native WS
  - [ ] Implement authentication for WebSocket
  - [ ] Create game channels (`game:{gameId}`)
- [ ] **Client → Server Events**
  - [ ] `JOIN_GAME` handler
  - [ ] `MAKE_MOVE` handler
  - [ ] `RESIGN` handler
  - [ ] `REQUEST_SYNC` handler
- [ ] **Server → Client Events**
  - [ ] `GAME_STATE` broadcaster
  - [ ] `MOVE_APPLIED` broadcaster
  - [ ] `MOVE_REJECTED` broadcaster
  - [ ] `GAME_ENDED` broadcaster
- [ ] **Reconnection Logic**
  - [ ] Implement reconnection handling
  - [ ] Implement state synchronization
  - [ ] Test reconnection scenarios

## Phase 10: Matchmaking System (MVP)

- [ ] **PvE Matchmaking**
  - [ ] Instant game creation with bot
  - [ ] Difficulty selection
  - [ ] Bot assignment
- [ ] **PvP Matchmaking (Simple)**
  - [ ] Create matchmaking queue
  - [ ] Implement rating-based pairing
  - [ ] Implement queue timeout handling
- [ ] **Matchmaking Service**
  - [ ] Create background worker
  - [ ] Implement queue management
  - [ ] Test matchmaking scenarios

## Phase 11: Rating System

- [ ] **ELO/ILO Implementation**
  - [ ] Implement rating calculation algorithm
  - [ ] Create rating update service
  - [ ] Implement provisional rating system
- [ ] **Rating Integration**
  - [ ] Update ratings after game completion
  - [ ] Store rating history
  - [ ] Create leaderboard queries

## Phase 12: Testing & Quality Assurance

- [ ] **Unit Tests**
  - [ ] Domain layer tests (>90% coverage)
  - [ ] Application layer tests
  - [ ] Service tests
- [ ] **Integration Tests**
  - [ ] API endpoint tests
  - [ ] WebSocket flow tests
  - [ ] Database integration tests
  - [ ] Engine integration tests
- [ ] **End-to-End Tests**
  - [ ] Complete game flow (PvP)
  - [ ] Complete game flow (PvE)
  - [ ] Reconnection scenarios
  - [ ] Time control scenarios

## Phase 13: Security & Compliance

- [ ] **Security Implementation**
  - [ ] Implement rate limiting
  - [ ] Implement input validation
  - [ ] Implement SQL injection prevention
  - [ ] Implement XSS prevention
  - [ ] Set up CORS properly
- [ ] **Privacy & Policy**
  - [ ] Implement data protection measures
  - [ ] Implement user data deletion
  - [ ] Create privacy policy endpoint
  - [ ] Implement audit logging

## Phase 14: Performance Optimization

- [ ] **Database Optimization**
  - [ ] Add necessary indexes
  - [ ] Optimize queries
  - [ ] Implement connection pooling
- [ ] **Caching Strategy**
  - [ ] Implement game state caching
  - [ ] Implement user session caching
  - [ ] Configure cache invalidation
- [ ] **Load Testing**
  - [ ] Test concurrent games
  - [ ] Test WebSocket connections
  - [ ] Identify bottlenecks

## Phase 15: Deployment & DevOps

- [ ] **Containerization**
  - [ ] Create Dockerfile
  - [ ] Create docker-compose.yml
  - [ ] Test local Docker deployment
- [ ] **CI/CD Pipeline**
  - [ ] Set up GitHub Actions / GitLab CI
  - [ ] Configure automated testing
  - [ ] Configure automated deployment
- [ ] **Production Deployment**
  - [ ] Set up production database
  - [ ] Configure environment variables
  - [ ] Deploy to cloud platform
  - [ ] Set up monitoring and logging
  - [ ] Configure backup strategy

## Phase 16: Documentation & Handoff

- [ ] **Developer Documentation**
  - [ ] API documentation
  - [ ] Architecture documentation
  - [ ] Deployment guide
  - [ ] Contribution guidelines
- [ ] **User Documentation**
  - [ ] Game rules documentation
  - [ ] User guide
  - [ ] FAQ
- [ ] **Code Documentation**
  - [ ] Add JSDoc comments
  - [ ] Document complex algorithms
  - [ ] Create README files
