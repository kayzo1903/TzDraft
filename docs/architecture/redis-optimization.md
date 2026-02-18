# Redis System Optimization Strategy

**Date:** 2026-02-18
**Author:** Antigravity (Assistant)

## 1. Introduction

Redis is an open-source, in-memory data structure store used as a database, cache, and message broker. Integrating Redis into the **TzDraft** architecture will unlock significant performance improvements, scalability for the online multiplayer system, and robust real-time features.

This document outlines the specific areas where Redis should be applied to maximize system efficiency.

## 2. Core Optimization Areas

### 2.1 Scaling Socket.IO (The "Adapter" Pattern)

**Problem:** Currently, the WebSocket server stores connection state in memory. If we deploy multiple backend instances (e.g., for load balancing), a player on Server A cannot play against a player on Server B because the servers don't share events.
**Solution:** Use the **Redis Adapter** for Socket.IO.

- **Mechanism**: Redis acts as a Pub/Sub message broker. When Server A emits an event (e.g., `moveMade`), it publishes it to Redis. Redis forwards it to Server B, which then sends it to the connected client.
- **Benefit**: Horizontal scalability. We can add as many backend servers as needed without breaking multiplayer functionality.

### 2.2 Game State Caching

**Problem:** Every move validation or board update currently requires querying the primary database (PostgreSQL). This adds latency and load to the DB.
**Solution:** Cache active game states in Redis.

- **Key**: `game:{id}:state`
- **Value**: JSON object of the board, current turn, and clock.
- **TTL**: Set to 1 hour (refreshes on activity).
- **Workflow**:
  1.  **Read**: Check Redis first. If missing, fetch from DB and cache it.
  2.  **Write**: Update Redis immediately -> Emit Socket Event -> Async write to DB (Write-Behind or Write-Through pattern).
- **Benefit**: Microsecond-level read/write speeds for gameplay logic, drastically reducing lag.

### 2.3 User Session Management

**Problem:** Verifying JWTs or fetching user profiles on every request/socket packet adds overhead.
**Solution:** Store session validity or "online status" in Redis.

- **Key**: `user:{id}:session`
- **Value**: `{ "status": "online", "serverId": "server-1", "gameId": "game-123" }`
- **Benefit**: Instant validation of user presence and faster reconnection handling.

### 2.4 Rate Limiting & Security

**Problem:** The matchmaking API is vulnerable to spamming (DoS attacks) or griefing.
**Solution:** Implement a sliding window rate limiter using Redis atomic counters.

- **Logic**: Allow max 5 matchmaking requests per minute per user.
- **Implementation**: `INCR user:{id}:match_requests` with `EXPIRE 60`.
- **Benefit**: Protects the matchmaking queue and server resources from abuse.

### 2.5 Real-Time Leaderboards

**Problem:** Calculating "Top 100 Players" via SQL (`SELECT * FROM users ORDER BY rating DESC LIMIT 100`) is expensive as the user base grows.
**Solution:** Use Redis **Sorted Sets** (`ZSET`).

- **Command**: `ZADD leaderboard 1500 "user_123"`
- **Retrieval**: `ZREVRANGE leaderboard 0 99 WITHSCORES`
- **Benefit**: Retrieving the top 100 players takes O(log(N)) time, which is practically instantaneous even with millions of users.

### 2.6 Job Queues (BullMQ)

**Problem:** Heavy tasks like sending emails, processing game analytics, or AI move generation can block the main Node.js event loop.
**Solution:** Offload these to a Redis-backed queue system like **BullMQ**.

- **producers**: The main API adds a job (`queue.add('sendEmail', { ... })`).
- **Consumers**: Separate worker processes pick up jobs from Redis and execute them.
- **Benefit**: Keeps the game server responsive and lag-free.

## 3. Implementation Roadmap

1.  **Phase 1 (Infrastructure)**: Provision a Redis instance (e.g., via Docker or managed cloud provider like Upstash/AWS ElastiCache).
2.  **Phase 2 (Scalability)**: Configure `socket.io-redis-adapter` in `GamesGateway`.
3.  **Phase 3 (Performance)**: Implement Caching Service for `Game` entities.
4.  **Phase 4 (Features)**: Migrate Leaderboard to Redis Sorted Sets.

## 4. Conclusion

Introducing Redis is the most high-impact architectural change we can make for **TzDraft**. It directly addresses the latency requirements of real-time gaming and provides a clear path for scaling the application to thousands of concurrent users.
