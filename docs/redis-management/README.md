# TzDraft — Redis Management Guide

**For:** Complete beginners
**Last updated:** 2026-03-07

---

## Table of Contents

1. [What is Redis and why we use it](#1-what-is-redis-and-why-we-use-it)
2. [How TzDraft uses Redis](#2-how-tzdraft-uses-redis)
3. [Starting and stopping Redis](#3-starting-and-stopping-redis)
4. [Connecting to Redis (the CLI)](#4-connecting-to-redis-the-cli)
5. [Inspecting your data](#5-inspecting-your-data)
6. [The 20 commands you actually need](#6-the-20-commands-you-actually-need)
7. [Monitoring Redis health](#7-monitoring-redis-health)
8. [Memory management](#8-memory-management)
9. [Manually fixing the matchmaking queue](#9-manually-fixing-the-matchmaking-queue)
10. [Clearing the game cache](#10-clearing-the-game-cache)
11. [Production checklist](#11-production-checklist)
12. [Troubleshooting common problems](#12-troubleshooting-common-problems)

---

## 1. What is Redis and why we use it

Think of Redis like a **whiteboard in a shared office**.

- **PostgreSQL** is your filing cabinet — reliable, permanent, but slow to search.
- **Redis** is the whiteboard — instant to read and write, but the contents are temporary.

Redis is a **key-value store** that lives entirely in RAM (memory). This means:

| Operation | PostgreSQL | Redis |
|---|---|---|
| Simple read | ~5–20 ms | ~0.1–0.5 ms |
| Write | ~5–20 ms | ~0.1–0.5 ms |
| Finding a player in queue | Requires DB query | Instant ZSET lookup |

Redis is **not** meant to store your main data permanently — that is PostgreSQL's job.
Redis stores **temporary, fast-access data** like:
- "Who is currently waiting in the matchmaking queue?"
- "What does this active game's board look like right now?"

---

## 2. How TzDraft uses Redis

TzDraft uses Redis for **two specific things**. Nothing else goes in Redis.

---

### 2.1 Matchmaking Queue

**The problem Redis solves:**
When two players click "Find a match" at the same time, the server must pair them correctly — even if many players join at once. Using PostgreSQL for this causes lock contention and slow serializable transactions.

**How it works in Redis:**

```
┌─────────────────────────────────────────────────┐
│  mmq:zset:300000   (SORTED SET — 5-minute games) │
│                                                  │
│  score (joinedAt timestamp)  →  userId           │
│  1741234100000               →  "user-alice"     │
│  1741234105000               →  "user-bob"       │
│  1741234112000               →  "user-charlie"   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  mmq:entry:user-alice   (HASH — player details) │
│                                                  │
│  userId     →  "user-alice"                      │
│  timeMs     →  "300000"                          │
│  socketId   →  "socket-xyz"                      │
│  rating     →  "1450"                            │
│  joinedAt   →  "1741234100000"                   │
└─────────────────────────────────────────────────┘
```

- `mmq:zset:{timeMs}` — sorted set ordered by join time (oldest first)
- `mmq:entry:{userId}` — hash with all of a player's queue details
- TTL: 120 seconds (entries auto-delete if a match never happens)

**When a player finds an opponent:**
A Lua script atomically removes the opponent from the sorted set AND deletes their hash entry in one step. This means two servers can never accidentally pair the same person twice.

---

### 2.2 Game State Cache

**The problem Redis solves:**
When a move is played, both players' browsers fetch the game state. Without cache, every move = a Postgres query. With Redis, the second read is free.

**How it works:**

```
┌──────────────────────────────────────────────────────┐
│  game:abc-123-def   (STRING — JSON of Postgres row)  │
│                                                       │
│  Value: { "id": "abc-123-def", "status": "ACTIVE",   │
│           "boardSnapshot": [...], "clock": {...} }    │
│                                                       │
│  TTL: 30 seconds (active game)                        │
│  TTL: 300 seconds (finished game)                     │
└──────────────────────────────────────────────────────┘
```

- When a move is played, the cache for that game is **deleted** (invalidated)
- The next read hits Postgres and refreshes the cache
- This is called a **write-invalidate, read-through cache**

---

## 3. Starting and stopping Redis

Redis runs as a Docker container defined in `docker-compose.yml`.

### Start Redis (with everything else)
```bash
docker compose up -d
```

### Start Redis only
```bash
docker compose up -d redis
```

### Stop Redis
```bash
docker compose stop redis
```

### Restart Redis (e.g. after a config change)
```bash
docker compose restart redis
```

### Check if Redis is running
```bash
docker compose ps redis
```

Expected output:
```
NAME              IMAGE          STATUS         PORTS
tzdraft-redis-1   redis:7-alpine Up 5 minutes   0.0.0.0:6379->6379/tcp
```

If STATUS says `Exit` or `Restarting`, see [Troubleshooting](#12-troubleshooting-common-problems).

---

## 4. Connecting to Redis (the CLI)

The Redis CLI is a terminal where you type commands directly to Redis.

### Open the Redis CLI (inside Docker)
```bash
docker compose exec redis redis-cli
```

You will see:
```
127.0.0.1:6379>
```

This means you are connected. You can now type Redis commands.

### Test the connection
```
127.0.0.1:6379> PING
PONG
```

If you see `PONG`, Redis is alive.

### Exit the CLI
```
127.0.0.1:6379> EXIT
```

### Run a single command without entering the CLI
```bash
docker compose exec redis redis-cli PING
docker compose exec redis redis-cli INFO server
```

---

## 5. Inspecting your data

These commands help you see what is currently stored in Redis.

### See all keys (be careful in production — slow on large datasets)
```bash
docker compose exec redis redis-cli KEYS "*"
```

Example output when players are in queue:
```
1) "mmq:zset:300000"
2) "mmq:entry:user-alice-id"
3) "mmq:entry:user-bob-id"
4) "game:abc-123-def"
```

### See who is waiting in the matchmaking queue (5-minute games)
```bash
# Show all players waiting for 5-minute (300,000 ms) games
# with their join timestamps (score)
docker compose exec redis redis-cli ZRANGE mmq:zset:300000 0 -1 WITHSCORES
```

Output:
```
1) "user-alice-id"    ← userId
2) "1741234100000"    ← joinedAt timestamp (Unix ms)
3) "user-bob-id"
4) "1741234105000"
```

The player with the LOWEST score joined FIRST (oldest = matched first).

### See a specific player's queue entry
```bash
docker compose exec redis redis-cli HGETALL mmq:entry:user-alice-id
```

Output:
```
 1) "userId"
 2) "user-alice-id"
 3) "timeMs"
 4) "300000"
 5) "socketId"
 6) "socket-xyz-abc"
 7) "rating"
 8) "1450"
 9) "joinedAt"
10) "1741234100000"
```

### See a cached game
```bash
docker compose exec redis redis-cli GET game:abc-123-def
```

Output is a long JSON string (the game row from Postgres).

### See how long a key has before it expires (TTL)
```bash
# Returns seconds remaining. -1 means no expiry. -2 means key doesn't exist.
docker compose exec redis redis-cli TTL mmq:entry:user-alice-id
```

Output: `87` means this entry expires in 87 seconds.

### Count how many keys exist
```bash
docker compose exec redis redis-cli DBSIZE
```

### Count how many players are waiting for 5-minute games
```bash
docker compose exec redis redis-cli ZCARD mmq:zset:300000
```

---

## 6. The 20 commands you actually need

| Command | What it does | Example |
|---|---|---|
| `PING` | Test connection | `PING` → `PONG` |
| `DBSIZE` | Count all keys | `DBSIZE` → `42` |
| `KEYS pattern` | Find keys by pattern | `KEYS mmq:*` |
| `TYPE key` | What type is a key? | `TYPE mmq:zset:300000` → `zset` |
| `TTL key` | Seconds until expiry | `TTL game:abc` → `24` |
| `PERSIST key` | Remove expiry from a key | `PERSIST game:abc` |
| `DEL key` | Delete a key | `DEL mmq:entry:user-x` |
| `EXISTS key` | Does key exist? | `EXISTS game:abc` → `1` |
| `GET key` | Read a string value | `GET game:abc` |
| `SET key value EX seconds` | Write a string with expiry | `SET mykey hello EX 60` |
| `HGETALL key` | Read all hash fields | `HGETALL mmq:entry:user-x` |
| `HGET key field` | Read one hash field | `HGET mmq:entry:user-x rating` |
| `ZRANGE key 0 -1 WITHSCORES` | All sorted set members + scores | `ZRANGE mmq:zset:300000 0 -1 WITHSCORES` |
| `ZCARD key` | Count sorted set members | `ZCARD mmq:zset:300000` |
| `ZREM key member` | Remove from sorted set | `ZREM mmq:zset:300000 user-x` |
| `ZRANGEBYSCORE key min max` | Members within score range | `ZRANGEBYSCORE mmq:zset:300000 0 9999999999999` |
| `INFO` | Server stats (everything) | `INFO` |
| `INFO memory` | Memory usage only | `INFO memory` |
| `INFO stats` | Commands per second | `INFO stats` |
| `FLUSHDB` | **DELETE ALL KEYS** ⚠️ | `FLUSHDB` |

> ⚠️ **FLUSHDB wipes everything in Redis.** Only use this in development to reset state. In production, delete specific keys instead.

---

## 7. Monitoring Redis health

### Quick health check
```bash
docker compose exec redis redis-cli PING
```

### Full server information
```bash
docker compose exec redis redis-cli INFO
```

Key sections to look for in INFO output:

```
# Server
redis_version:7.2.3          ← Redis version
uptime_in_seconds:86400       ← How long Redis has been running

# Clients
connected_clients:3           ← How many connections right now
                              ← Should be low (1-10 for TzDraft)

# Memory
used_memory_human:2.50M       ← RAM currently used by data
used_memory_peak_human:4.20M  ← Highest RAM ever used
maxmemory_human:0B            ← 0 means no limit set (fine for dev)

# Stats
total_commands_processed:12450  ← Total commands since start
instantaneous_ops_per_sec:5     ← Commands per second right now
                                ← Normal for TzDraft: 0–50

# Keyspace
db0:keys=8,expires=6,avg_ttl=45000  ← 8 keys total, 6 have expiry
```

### Watch live commands (for debugging)
```bash
docker compose exec redis redis-cli MONITOR
```

This shows every command Redis receives in real time. Press `Ctrl+C` to stop.
**Do not run MONITOR in production for long** — it impacts performance.

### Check memory in a single command
```bash
docker compose exec redis redis-cli INFO memory | grep used_memory_human
```

---

## 8. Memory management

### How much memory is TzDraft using?

Each queue entry uses roughly:
- ZSET member: ~80 bytes
- HASH (entry details): ~200 bytes
- Total per waiting player: ~280 bytes

Each cached game uses roughly:
- JSON string: ~2–5 KB

**Example:** 100 concurrent players in queue + 50 cached games ≈ 100×280B + 50×5KB = **278 KB**. Redis can handle millions of times more than this. Memory is not a concern for TzDraft at any realistic scale.

### Setting a memory limit (production best practice)

If you want to cap how much RAM Redis uses, add to `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --save "" --appendonly no --maxmemory 256mb --maxmemory-policy allkeys-lru
```

- `--maxmemory 256mb` — stop using more than 256 MB
- `--maxmemory-policy allkeys-lru` — when full, delete the least-recently-used key first

> For TzDraft, 256 MB is enough for tens of thousands of concurrent players.

### Check current memory usage
```bash
docker compose exec redis redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"
```

---

## 9. Manually fixing the matchmaking queue

These commands are for when something goes wrong with the queue.

### Situation: A player is stuck in the queue (they disconnected but entry didn't clean up)

```bash
# 1. Find the player's userId from your DB or logs, then:
docker compose exec redis redis-cli HGETALL mmq:entry:<userId>

# 2. Remove them from the sorted set
docker compose exec redis redis-cli ZREM mmq:zset:300000 <userId>

# 3. Delete their hash entry
docker compose exec redis redis-cli DEL mmq:entry:<userId>
```

### Situation: The entire matchmaking queue is broken / corrupted

```bash
# Delete all matchmaking keys (players will need to re-join queue)
docker compose exec redis redis-cli --scan --pattern "mmq:*" | xargs docker compose exec -T redis redis-cli DEL
```

Or inside the CLI:
```
127.0.0.1:6379> KEYS mmq:*
1) "mmq:zset:300000"
2) "mmq:entry:user-abc"
3) "mmq:entry:user-def"

127.0.0.1:6379> DEL mmq:zset:300000 mmq:entry:user-abc mmq:entry:user-def
(integer) 3
```

### Situation: See how many people are waiting per time control

```bash
# 1 minute games (60,000 ms)
docker compose exec redis redis-cli ZCARD mmq:zset:60000

# 5 minute games (300,000 ms)
docker compose exec redis redis-cli ZCARD mmq:zset:300000

# 10 minute games (600,000 ms)
docker compose exec redis redis-cli ZCARD mmq:zset:600000
```

### Situation: Manually add a player to the queue (testing only)

```bash
# Use current timestamp as score
TS=$(date +%s%3N)

# Add to sorted set
docker compose exec redis redis-cli ZADD mmq:zset:300000 $TS "test-user-id"

# Add entry hash
docker compose exec redis redis-cli HSET mmq:entry:test-user-id \
  userId test-user-id \
  timeMs 300000 \
  socketId "test-socket" \
  rating 1200 \
  joinedAt $TS

# Set 2-minute TTL on hash
docker compose exec redis redis-cli EXPIRE mmq:entry:test-user-id 120
```

---

## 10. Clearing the game cache

Game cache entries auto-expire (30 seconds for active games, 5 minutes for finished games). You rarely need to clear them manually. But if you do:

### Clear cache for one specific game
```bash
docker compose exec redis redis-cli DEL game:<gameId>
```

Example:
```bash
docker compose exec redis redis-cli DEL game:abc-123-def-456
```

### Clear all game cache entries
```bash
# Inside the CLI:
127.0.0.1:6379> KEYS game:*
1) "game:abc-123-def"
2) "game:xyz-789-ghi"

127.0.0.1:6379> DEL game:abc-123-def game:xyz-789-ghi
(integer) 2
```

When should you clear the game cache?
- After a **database restore** (to prevent Redis from serving stale data)
- After a **bug fix** that changes how game state is serialized
- When debugging a game state issue and you want the next read to come fresh from Postgres

---

## 11. Production checklist

These are things you must do before launching with real users.

### 11.1 Set a Redis password

By default, Redis has no password. Anyone who can reach port 6379 can read and delete all data.

In `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --save "" --appendonly no --requirepass "${REDIS_PASSWORD}"
```

In `.env`:
```
REDIS_PASSWORD=your-very-long-random-password-here
REDIS_URL=redis://:your-very-long-random-password-here@redis:6379
```

### 11.2 Don't expose Redis to the internet

Redis port (6379) should **never** be open to the public internet.
In docker-compose, remove the `ports` section from the redis service if you don't need CLI access from outside Docker:

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --save "" --appendonly no
  # No ports: block — only containers in the same network can reach Redis
```

The backend container can still connect because it's in the same Docker network.

### 11.3 Check the REDIS_URL is correct

On Railway or Render, you get a Redis connection string like:
```
redis://:password@redis.railway.internal:6379
```

Add this to your production environment variables as `REDIS_URL`.

Verify it works:
```bash
# On the production server:
redis-cli -u "redis://:password@redis.railway.internal:6379" PING
```

### 11.4 Enable persistence (optional, for matchmaking queue survival across restarts)

By default we run Redis with `--save "" --appendonly no` — meaning data is **not saved to disk**. If Redis restarts, the queue is empty. This is fine because:
- Queue entries auto-expire in 2 minutes anyway
- Players will just re-click "Find a match"

If you want queue data to survive Redis restarts (e.g. during deployment):

```yaml
redis:
  command: redis-server --appendonly yes
```

This writes every command to a log file. Redis replays it on restart. **Slightly slower but more durable.**

### 11.5 Set a maxmemory limit

Prevents Redis from consuming all server RAM if a bug creates unlimited keys:

```yaml
redis:
  command: redis-server --save "" --appendonly no --maxmemory 256mb --maxmemory-policy allkeys-lru
```

---

## 12. Troubleshooting common problems

### Problem: Backend logs `Redis error: connect ECONNREFUSED 127.0.0.1:6379`

**What it means:** The backend cannot connect to Redis.

**Fix:**
```bash
# 1. Check Redis is running
docker compose ps redis

# 2. If not running, start it
docker compose up -d redis

# 3. Check REDIS_URL in .env matches the Redis container
# In docker-compose, it should be:
# REDIS_URL=redis://redis:6379
# NOT redis://localhost:6379 (localhost refers to the backend container itself)
```

---

### Problem: Matchmaking doesn't work — players wait forever

**What it means:** Either the queue is empty or the Elo gap filter is too strict.

**Diagnose:**
```bash
# How many players are waiting?
docker compose exec redis redis-cli ZCARD mmq:zset:300000

# Who is waiting?
docker compose exec redis redis-cli ZRANGE mmq:zset:300000 0 -1 WITHSCORES

# Check their ratings
docker compose exec redis redis-cli HGET mmq:entry:<userId> rating
```

If two players are waiting but their ratings differ by more than 200 Elo, they won't match. Ask one player to wait longer (the gap widens over time in most games, but TzDraft currently uses a fixed 200-point window).

---

### Problem: `WRONGTYPE Operation against a key holding the wrong kind of value`

**What it means:** A key in Redis has an unexpected type (e.g., a game key that should be a string is actually a hash from an old version of the code).

**Fix:** Delete the bad key and let it be recreated:
```bash
docker compose exec redis redis-cli TYPE game:abc-123   # See what type it is
docker compose exec redis redis-cli DEL game:abc-123    # Delete it
```

---

### Problem: Redis is using too much memory

**Diagnose:**
```bash
docker compose exec redis redis-cli INFO memory | grep used_memory_human
```

**Fix options:**
1. Check for keys that should have TTL but don't:
   ```bash
   docker compose exec redis redis-cli --scan | while read key; do
     ttl=$(docker compose exec redis redis-cli TTL "$key")
     if [ "$ttl" = "-1" ]; then echo "NO TTL: $key"; fi
   done
   ```

2. Clear the game cache (game keys are the biggest):
   ```bash
   docker compose exec redis redis-cli --scan --pattern "game:*" | wc -l   # How many?
   ```

3. Restart Redis (clears everything, players re-queue):
   ```bash
   docker compose restart redis
   ```

---

### Problem: `NOAUTH Authentication required`

**What it means:** Redis has a password set but your `REDIS_URL` doesn't include it.

**Fix:** Update `REDIS_URL` in `.env`:
```
REDIS_URL=redis://:your-password@redis:6379
```

Note the `:` before the password and `@` after it.

---

### Problem: After a deploy, some games show wrong state

**What it means:** The game cache has stale data from before the deploy.

**Fix:** Clear all game cache entries:
```bash
# This forces all game reads to come fresh from Postgres
docker compose exec redis redis-cli --scan --pattern "game:*" | \
  xargs docker compose exec -T redis redis-cli DEL
```

---

## Quick reference card

```
Check Redis is up:      docker compose ps redis
Open CLI:               docker compose exec redis redis-cli
Test connection:        PING
Count all keys:         DBSIZE
Who's in queue (5min):  ZRANGE mmq:zset:300000 0 -1 WITHSCORES
Count queue (5min):     ZCARD mmq:zset:300000
Player's queue entry:   HGETALL mmq:entry:<userId>
Remove player from Q:   ZREM mmq:zset:300000 <userId>
                        DEL mmq:entry:<userId>
Clear game cache:       DEL game:<gameId>
Memory usage:           INFO memory | grep used_memory_human
Live command stream:    MONITOR    (Ctrl+C to stop)
DANGER — wipe all:      FLUSHDB
```
