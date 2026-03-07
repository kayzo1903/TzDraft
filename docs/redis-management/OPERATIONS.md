# Redis Operations — Daily Tasks & Incident Playbooks

This file covers the practical things you'll do on a regular basis as an operator.

---

## Daily health check (30 seconds)

Run this every morning on production:

```bash
# 1. Is Redis up?
docker compose ps redis

# 2. Quick ping
docker compose exec redis redis-cli PING

# 3. Memory usage
docker compose exec redis redis-cli INFO memory | grep used_memory_human

# 4. How many total keys?
docker compose exec redis redis-cli DBSIZE

# 5. How many players waiting in each queue right now?
docker compose exec redis redis-cli ZCARD mmq:zset:60000    # 1-minute games
docker compose exec redis redis-cli ZCARD mmq:zset:300000   # 5-minute games
docker compose exec redis redis-cli ZCARD mmq:zset:600000   # 10-minute games
```

---

## Before every deploy

Game cache may have data that doesn't match the new code. Clear it:

```bash
# Count how many game cache entries exist
docker compose exec redis redis-cli DBSIZE

# Clear game cache (safe — data lives in Postgres)
docker compose exec redis redis-cli --scan --pattern "game:*" | \
  xargs -r docker compose exec -T redis redis-cli DEL

echo "Game cache cleared. Next reads will come from Postgres."
```

---

## After a database restore

When you restore from a Postgres backup, Redis still has stale cached game data.
Always clear ALL Redis data after a DB restore:

```bash
# Stop backend first (prevents new data being written to cache)
docker compose stop backend

# Clear Redis completely
docker compose exec redis redis-cli FLUSHDB

# Start backend again
docker compose start backend

echo "Redis cleared. All reads will come from freshly restored Postgres."
```

---

## Incident: Player reports they can't find a match

**Step 1** — Check if they are actually in the queue:
```bash
# You need their userId from the database
docker compose exec redis redis-cli HGETALL mmq:entry:<their-userId>
```

If output is empty, they are not in Redis queue. Ask them to click "Find Match" again.

**Step 2** — Check if there's anyone to match them with:
```bash
docker compose exec redis redis-cli ZRANGE mmq:zset:300000 0 -1 WITHSCORES
```

**Step 3** — Check if it's a rating gap problem:
```bash
# Get their rating
docker compose exec redis redis-cli HGET mmq:entry:<their-userId> rating

# Get all other players' ratings
docker compose exec redis redis-cli ZRANGE mmq:zset:300000 0 -1 | \
  xargs -I{} docker compose exec -T redis redis-cli HGET mmq:entry:{} rating
```

If no one is within ±200 Elo of them, they'll wait until someone joins.

---

## Incident: Player is stuck in queue forever (ghost entry)

This happens if a player's browser crashed before the server could remove them from the queue.

```bash
# Check if their entry has expired TTL
docker compose exec redis redis-cli TTL mmq:entry:<their-userId>
# If result is -1, the entry has no TTL and won't auto-expire

# Manually remove them
docker compose exec redis redis-cli ZREM mmq:zset:300000 <their-userId>
docker compose exec redis redis-cli DEL mmq:entry:<their-userId>
echo "Player removed from queue."
```

---

## Incident: Game shows wrong board state to a player

The game cache may have stale data.

```bash
# You need the gameId from your logs or DB
docker compose exec redis redis-cli DEL game:<gameId>
echo "Cache cleared for game $gameId. Next request will load fresh from Postgres."
```

Ask the player to refresh their browser. The game will reload from the database.

---

## Understanding key expiry (TTL)

Every key in Redis can have an expiry time. When it expires, Redis deletes it automatically.

```
Key                          │ TTL          │ Reason
─────────────────────────────┼──────────────┼─────────────────────────────────
mmq:entry:{userId}           │ 120 seconds  │ If never matched, auto-cleans up
mmq:zset:{timeMs}            │ No TTL       │ Managed manually (ZREM on match)
game:{gameId} (active)       │ 30 seconds   │ Refreshed on every game load
game:{gameId} (finished)     │ 300 seconds  │ Finished games change rarely
```

To check any key's expiry:
```bash
docker compose exec redis redis-cli TTL <key-name>
# -2 = key doesn't exist
# -1 = key exists but has no expiry
# 0+ = seconds remaining
```

---

## Understanding the data flow (beginner diagram)

```
Player clicks "Find Match"
         │
         ▼
Backend receives request
         │
         ├──► Remove stale queue entries (old players who left)
         │
         ├──► Remove own previous entry (in case they re-queued)
         │
         ├──► Postgres: "Am I already in a game?" ──► YES → return "waiting"
         │                                         │
         │                                         NO
         │                                         │
         ├──► Redis: "Is there an opponent in     ◄┘
         │    the sorted set matching my timeMs
         │    and within ±200 Elo?"
         │
         ├── NO OPPONENT FOUND ─────────────────────────────────────────────┐
         │                                                                    │
         ▼                                                                    ▼
   Redis: ZADD me to sorted set              Return { status: "waiting" }
   Redis: HSET my entry hash
   Redis: EXPIRE entry 120s
         │
         ▼
   Return { status: "waiting" }


         (When opponent exists:)
         │
         ├──► Redis Lua script:
         │    ZREM opponent from sorted set  ← ATOMIC (race-condition safe)
         │    DEL opponent hash entry        ← Both or neither happen
         │
         ├──► Postgres: "Is opponent still not in a game?" ──► IN GAME → re-queue self
         │                                                   │
         │                                                   NOT IN GAME
         │                                                   │
         └──► Postgres: CREATE game record ◄─────────────────┘
                        (assigns colors randomly)
         │
         ▼
   Return { status: "matched", gameId, opponentUserId }
   WebSocket: notify both players
```

---

## Redis data model — visual summary

```
Redis keyspace for TzDraft
══════════════════════════

SORTED SETS (ZSET)
  mmq:zset:60000    → players waiting for  1-minute games (score = joinedAt ms)
  mmq:zset:300000   → players waiting for  5-minute games
  mmq:zset:600000   → players waiting for 10-minute games

  How to read: ZRANGE key 0 -1 WITHSCORES
  Format:  [userId, timestamp, userId, timestamp, ...]
  Order:   Lowest score (oldest joinedAt) = first to be matched


HASHES (HASH)
  mmq:entry:{userId}  → one hash per player in queue
    Fields: userId, timeMs, socketId, rating, rd, volatility, joinedAt

  How to read: HGETALL mmq:entry:{userId}
  TTL: 120 seconds (auto-expires if match never found)


STRINGS (STRING)
  game:{gameId}  → JSON string (serialized Postgres game row)
    Contains: id, status, boardSnapshot, clock, players, etc.

  How to read: GET game:{gameId}
  TTL: 30 seconds (active), 300 seconds (finished)


NOTHING ELSE should be in Redis.
If you see unexpected keys, investigate — it may be a bug.
```
