# Phase 12: Production Hardening

**Status:** ✅ Complete
**Branch:** `feature/docs-evaluation`
**Last updated:** 2026-03-08

---

## Goal

Harden the backend for real production traffic before the first public release. All changes are non-functional from the user's perspective — they improve security, resilience, and horizontal scalability without altering any game logic or API contracts.

---

## What We Achieved

### P12.1 — HTTP Security Headers (helmet)

- Installed `helmet` and applied it globally in `backend/src/main.ts`
- Content Security Policy configured with strict directives:
  - `defaultSrc 'self'`, `objectSrc 'none'`, `frameSrc 'none'`
  - `scriptSrc 'self'`, `styleSrc 'self' 'unsafe-inline'`, `imgSrc 'self' data: https:`
- `crossOriginEmbedderPolicy` disabled to keep Socket.IO working
- Prevents clickjacking, MIME-type sniffing, and header injection attacks

### P12.2 — Global Exception Filter

- Created `backend/src/common/filters/all-exceptions.filter.ts`
- Registered via `app.useGlobalFilters()` in `main.ts`
- HTTP exceptions pass through with their original status and message
- Unexpected/unhandled errors: full stack trace logged internally via pino, client receives only `"Internal server error"` with a 500 status
- **Stack traces no longer leak to API consumers**

### P12.3 — Redis Health Check

- Extended `backend/src/health/health.controller.ts` with `RedisHealthIndicator`
- Uses `redis.client.ping()` — same connection as the app's `RedisService`
- `GET /health` now checks **both** database and Redis and returns an aggregate status
- Added `@Public()` decorator so load balancers and uptime monitors don't get 401'd
- Updated `HealthModule` to provide `RedisHealthIndicator`

### P12.4 — Auth Rate Limiting

- Applied `@Throttle({ default: { ttl: 60_000, limit: 5 } })` to sensitive auth endpoints in `backend/src/auth/auth.controller.ts`:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/send-otp`
  - `POST /auth/forgot-password`
- Reduced from the global 100 req/min to **5 req/min per IP** on these endpoints
- Brute-force and credential-stuffing attacks are now significantly harder

### P12.5 — Environment Variable Validation at Startup

- Created `backend/src/config/env.validation.ts`
- Plugged into `ConfigModule.forRoot({ validate })` in `app.module.ts`
- **Required vars** (server refuses to boot without them):
  - `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `CORS_ORIGINS`
- **Recommended vars** (warning logged in production if missing):
  - `SENTRY_DSN`, `FRONTEND_URL`, `BETTER_AUTH_SECRET`
- Added `REDIS_URL` to `backend/.env.example`

### P12.6 — Socket.IO Redis Adapter (Horizontal Scaling)

**The most architecturally significant change of this phase.**

Previously, Socket.IO rooms existed only in the memory of the process that created them. With multiple backend instances (or during a rolling deploy), `server.to(gameId).emit(...)` would only reach clients on the same instance — other players would miss all events.

**What changed:**

- Installed `@socket.io/redis-adapter`
- `afterInit` creates two dedicated ioredis connections (pub + sub) and wires `server.adapter(createAdapter(pubClient, subClient))`
- Every `server.to(room).emit(...)` is now published to a Redis pub/sub channel; all instances subscribe and forward to their local sockets

**All five in-memory Maps replaced with Redis:**

| Old (in-memory Map) | New (Redis key) | TTL |
|---------------------|-----------------|-----|
| `pendingDrawOffers` | `ws:draw:offer:{gameId}` | 24 h |
| `pendingRematchOffers` | `ws:rematch:offer:{gameId}` | 24 h |
| `userGameMap` | `ws:user:game:{userId}` | 24 h |
| `userConnectionCounts` | `ws:user:connections:{userId}` (INCR/DECR) | 24 h |
| `userSocketMap` + socketId lookup | personal room `user:{userId}` | n/a |

**Personal room pattern:**
- Each socket joins `user:{userId}` on connect
- `emitMatchFound` uses `server.to('user:{userId}').emit(...)` instead of a socketId lookup
- Routes correctly to any instance via the Redis adapter — no cross-instance socketId tracking needed

**What stayed local (correctly so):**
- `disconnectTimers` / `disconnectTickIntervals` — `setTimeout`/`setInterval` handles are process-bound; the broadcasts and DB writes inside them still reach all instances via the adapter
- `wsRateCounts` — per-socket rate limiting is always local since a socket lives on exactly one instance

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/main.ts` | Added `helmet`, registered `AllExceptionsFilter` |
| `backend/src/common/filters/all-exceptions.filter.ts` | **New** — global exception filter |
| `backend/src/config/env.validation.ts` | **New** — startup env validation |
| `backend/src/app.module.ts` | Wired `validateEnv` into `ConfigModule` |
| `backend/src/health/health.controller.ts` | Added `RedisHealthIndicator`, `@Public()` |
| `backend/src/health/health.module.ts` | Registered `RedisHealthIndicator` |
| `backend/src/auth/auth.controller.ts` | Added `@Throttle` on 4 sensitive endpoints |
| `backend/src/infrastructure/messaging/games.gateway.ts` | Full Redis adapter + Redis state refactor |
| `backend/.env.example` | Added `REDIS_URL` |
| `backend/package.json` | Added `helmet`, `@socket.io/redis-adapter` |

---

## Production Readiness Status After Phase 12

| Area | Status |
|------|--------|
| Auth & JWT | ✅ |
| Database + Migrations | ✅ |
| Docker / docker-compose | ✅ |
| Logging (pino + Sentry) | ✅ |
| Security headers (helmet/CSP) | ✅ P12.1 |
| Global exception filter | ✅ P12.2 |
| Health checks (DB + Redis) | ✅ P12.3 |
| Auth rate limiting | ✅ P12.4 |
| Env validation at boot | ✅ P12.5 |
| WebSocket horizontal scaling | ✅ P12.6 |
| CI — tests + lint | ✅ |
| **Production deploy pipeline** | ❌ Remaining |

---

## What Remains

### Production CI/CD Deploy Pipeline

The only remaining item before the project can be considered fully production-ready.

CI currently runs tests and lint on every PR and `main` push, but there is no automated deploy step. Deployments to the Hetzner VPS are still manual (SSH → `git pull` → `docker compose up`).

**Planned approach:**
- GitHub Actions workflow triggered on `push to main` or `git tag v*`
- Build and push Docker images to GitHub Container Registry (GHCR)
- SSH into Hetzner VPS, pull new images, run `docker compose up -d`
- Health check poll after deploy to verify success before marking the run green
