# WebSocket / Socket.IO Connection Failures in Production

**Date:** 2026-03-09
**Environment:** Production — `api.tzdraft.co.tz` (VPS behind nginx)
**Feature affected:** Play vs Friend (online PvP) + Matchmaking

---

## Symptoms

Browser console showed:

```
Firefox can't establish a connection to the server at
wss://api.tzdraft.co.tz/socket.io/?EIO=4&transport=websocket

HTTP/1.1 400 Bad Request
{"code":3,"message":"Bad request"}
```

Users could not start or join any online game — the Socket.IO handshake was rejected before a room could be joined.

---

## Root Causes Found (3 separate issues)

### 1. nginx — missing WebSocket proxy headers

The original nginx config had a single `location /` block that proxied everything to port 3002. It was missing:

- The `map $http_upgrade $connection_upgrade` directive (required to correctly set the `Connection` header for WebSocket upgrades).
- A dedicated `location /socket.io/` block with `proxy_buffering off` and extended timeouts.

Without these, nginx forwarded WebSocket upgrade requests with `Connection: close` instead of `Connection: Upgrade`, causing the backend to reject the handshake.

**Fix:** Rewrote `/etc/nginx/sites-available/tzdraft` on the VPS to add:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# Inside the api.tzdraft.co.tz server block:
location /socket.io/ {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
    proxy_buffering off;
}
```

---

### 2. CORS origin mismatch — www vs non-www

The `CORS_ORIGINS` env var on the VPS was set to `https://tzdraft.co.tz` (no www).
Some browsers were connecting from `https://www.tzdraft.co.tz`, causing a CORS rejection.

**Fix (nginx):** Added a www → non-www 301 redirect in the nginx `tzdraft.co.tz` server block:

```nginx
if ($host = www.tzdraft.co.tz) {
    return 301 https://tzdraft.co.tz$request_uri;
}
```

---

### 3. Socket.IO gateway — single-origin CORS + unguarded pubClient (code fix)

**File:** `backend/src/infrastructure/messaging/games.gateway.ts`

The `@WebSocketGateway` decorator was configured with:

```typescript
// OLD — only allows one origin
cors: {
  origin: process.env.FRONTEND_URL,
  credentials: true,
}
```

This is a separate CORS check performed by engine.io/Socket.IO itself, independent of nginx and the NestJS HTTP CORS config. It was the direct cause of the `{"code":3,"message":"Bad request"}` engine.io error — the handshake reached the backend but engine.io rejected it because the request `Origin` header didn't exactly match `FRONTEND_URL`.

Additionally, `this.pubClient` (the Redis pub/sub client used for socket room broadcasting) was called without null guards. In development mode Redis is not initialized, causing crashes on gateway events.

**Fix (code — branch `fix/pvp-game-update`, commit `8e456c15`):**

```typescript
// NEW — parses the full CORS_ORIGINS list (same source as HTTP CORS)
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
      .split(/[,\n]+/)
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
    credentials: true,
  },
  namespace: 'games',
})
```

All `this.pubClient` usages wrapped with `if (this.pubClient)` guards throughout the gateway.

---

## What Is Being Done to Fix It

| # | Fix | Where | Status |
|---|-----|--------|--------|
| 1 | nginx WebSocket proxy headers + dedicated `location /socket.io/` | VPS nginx config | ✅ Applied on VPS |
| 2 | nginx www → non-www redirect | VPS nginx config | ✅ Applied on VPS |
| 3 | Gateway CORS reads `CORS_ORIGINS` list; pubClient null guards | `games.gateway.ts` | ✅ Code committed on `fix/pvp-game-update` |
| 4 | Merge `fix/pvp-game-update` → `main` and push to trigger CI/CD deploy | GitHub / VPS | ⏳ Pending |

Once step 4 completes, CI builds a new backend Docker image and deploys it to the VPS. The backend container restarts with the corrected gateway — expected to resolve the `{"code":3}` error entirely.

---

## Verification Steps (after deploy)

```bash
# 1. Direct backend WebSocket test (should return 101)
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  "http://localhost:3002/socket.io/?EIO=4&transport=websocket"

# 2. Through nginx (should also return 101, not 400)
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Origin: https://tzdraft.co.tz" \
  "https://api.tzdraft.co.tz/socket.io/?EIO=4&transport=websocket"
```

Both should respond with `HTTP/1.1 101 Switching Protocols`.
