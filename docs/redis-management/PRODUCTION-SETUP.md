# Redis Production Setup Guide

This guide covers the exact steps to set up Redis correctly for a real production deployment
on Railway, Render, or any VPS.

---

## Option A — Redis on Railway (recommended for TzDraft)

Railway provides managed Redis. No server to maintain.

### Step 1: Add Redis to your Railway project

1. Open your Railway project dashboard
2. Click **+ New** → **Database** → **Add Redis**
3. Railway creates a Redis instance automatically
4. Click on the Redis instance → **Variables** tab
5. Copy the `REDIS_URL` value — it looks like:
   ```
   redis://default:somepassword@redis.railway.internal:6379
   ```

### Step 2: Add REDIS_URL to your backend service

1. Click on your **backend** service in Railway
2. Go to **Variables** tab
3. Add: `REDIS_URL` = (paste the value from step 1)

### Step 3: Verify

After deploy:
```bash
# Check backend logs for this line:
# [RedisService] Redis connection ready
railway logs --service backend | grep Redis
```

---

## Option B — Redis on Render

Render provides managed Redis on paid plans.

### Step 1: Create Redis instance

1. Render dashboard → **New** → **Redis**
2. Choose a region matching your backend
3. After creation, copy the **Internal Redis URL**

### Step 2: Set environment variable

On your backend service → **Environment** → add:
```
REDIS_URL=<internal-redis-url-from-render>
```

---

## Option C — Redis on a VPS (self-managed)

If you're running on a VPS (DigitalOcean, Hetzner, etc.):

### Install Redis
```bash
# Ubuntu / Debian
sudo apt update && sudo apt install redis-server -y

# Start and enable on boot
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify
redis-cli PING   # → PONG
```

### Secure Redis

```bash
sudo nano /etc/redis/redis.conf
```

Find and change:
```
# Bind to localhost only (not exposed to internet)
bind 127.0.0.1

# Set a strong password
requirepass YourVeryLongRandomPasswordHere

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG ""
```

Restart Redis:
```bash
sudo systemctl restart redis-server
```

### Set REDIS_URL for TzDraft backend

```bash
# In your .env on the server:
REDIS_URL=redis://:YourVeryLongRandomPasswordHere@127.0.0.1:6379
```

---

## Security hardening checklist

Run through this before going live:

```
[ ] REDIS_URL includes a strong password (min 32 random characters)
[ ] Redis port 6379 is NOT open in your firewall/security group
[ ] Redis only binds to 127.0.0.1 or internal Docker network
[ ] Dangerous commands (FLUSHDB, CONFIG) are renamed or disabled
[ ] REDIS_URL is stored as a secret environment variable (not in git)
[ ] maxmemory limit is set (e.g. 256mb)
[ ] maxmemory-policy is set to allkeys-lru
```

### Generate a strong password
```bash
# On Linux/Mac:
openssl rand -base64 48

# On Windows PowerShell:
[System.Web.Security.Membership]::GeneratePassword(48, 4)
```

---

## Verifying Redis works end-to-end

After deploying with Redis configured:

### Test 1: Basic connectivity
```bash
redis-cli -u "$REDIS_URL" PING
# Expected: PONG
```

### Test 2: Matchmaking queue works
1. Open two browser tabs with two different accounts
2. Both click "Find a match" with the same time control
3. They should be matched within 2–3 seconds
4. During matching, run:
   ```bash
   redis-cli -u "$REDIS_URL" ZCARD mmq:zset:300000
   ```
   It should briefly show 1 (one player in queue), then 0 (both matched).

### Test 3: Game cache works
1. Start a game and make a move
2. Immediately run:
   ```bash
   redis-cli -u "$REDIS_URL" KEYS "game:*"
   ```
   You should see the game ID in the list.
3. Wait 35 seconds and run again — the key should be gone (TTL expired).

---

## Environment variables reference

| Variable | Example | Description |
|---|---|---|
| `REDIS_URL` | `redis://:password@redis:6379` | Full connection URL |
| `REDIS_URL` (Railway) | `redis://default:abc@redis.railway.internal:6379` | Railway internal URL |
| `REDIS_URL` (local dev) | `redis://redis:6379` | No password in dev |

The backend reads `REDIS_URL` from environment. If not set, it defaults to `redis://localhost:6379`.
