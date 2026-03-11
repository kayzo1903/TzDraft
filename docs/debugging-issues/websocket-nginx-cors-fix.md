# WebSocket / Socket.IO Connection Failures in Production

**Date:** 2026-03-09
**Environment:** Production — `api.tzdraft.co.tz` (VPS behind nginx)
**Feature affected:** Play vs Friend (online PvP) + Matchmaking
**Status:** ⚠️ UNRESOLVED — all known fixes applied, issue persists

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

## Timeline of Fixes Attempted

### Fix 1 — nginx: missing WebSocket proxy headers ✅ Applied

**Problem:** The original nginx config had a single `location /` block with no special WebSocket handling. It was missing:

- The `map $http_upgrade $connection_upgrade` directive (required to correctly set the `Connection` header).
- A dedicated `location /socket.io/` block with `proxy_buffering off` and extended timeouts.

Without these, nginx forwarded WebSocket upgrade requests with `Connection: close` instead of `Connection: Upgrade`.

**Fix applied on VPS** (`/etc/nginx/sites-available/tzdraft`):

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

**Result:** Still `{"code":3,"message":"Bad request"}` after reload.

---

### Fix 2 — nginx: www → non-www redirect ✅ Applied

**Problem:** `CORS_ORIGINS` was set to `https://tzdraft.co.tz` (no www). If a browser accessed the site via `https://www.tzdraft.co.tz`, the WebSocket `Origin` header would be `https://www.tzdraft.co.tz` — not matching the allowed list → CORS rejection.

**Fix applied on VPS** — added to the `tzdraft.co.tz` server block:

```nginx
if ($host = www.tzdraft.co.tz) {
    return 301 https://tzdraft.co.tz$request_uri;
}
```

**Result:** Partially effective — page loads redirect correctly, but WebSocket requests go directly to `api.tzdraft.co.tz` and still carry `Origin: https://www.tzdraft.co.tz` because the browser's current page URL is still www.

---

### Fix 3 — Gateway CORS: single-origin → full CORS_ORIGINS list ✅ Deployed

**Problem:** `backend/src/infrastructure/messaging/games.gateway.ts` used:

```typescript
// OLD — only allows one origin string
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
  namespace: 'games',
})
```

This is a separate CORS check by engine.io itself, independent of nginx and NestJS HTTP CORS. If `Origin` didn't exactly match `FRONTEND_URL`, engine.io returned `{"code":3,"message":"Bad request"}`.

Also, `this.pubClient` (Redis pub/sub client) was called without null guards — crashes in dev mode.

**Fix** (branch `fix/pvp-game-update`, commit `8e456c15`, deployed via CI/CD):

```typescript
// NEW — parses the full CORS_ORIGINS list
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

All `this.pubClient` calls wrapped with `if (this.pubClient)` guards.

**Verification:** Container restarted at `2026-03-09T15:15:16Z` — new image confirmed running.

**Result:** Polling (`transport=polling`) returns `200 OK` with a session ID ✅. WebSocket still fails.

---

### Fix 4 — VPS .env: add www origin to CORS_ORIGINS ✅ Applied

**Problem confirmed from browser DevTools:** The actual browser request showed:

```
Origin: https://www.tzdraft.co.tz
```

Response was missing `Access-Control-Allow-Origin` entirely — CORS rejected at the Socket.IO level because `https://www.tzdraft.co.tz` was not in `CORS_ORIGINS`.

**Fix applied on VPS** — updated `/opt/tzdraft/.env`:

```
CORS_ORIGINS=https://tzdraft.co.tz,https://www.tzdraft.co.tz
```

Restarted backend:

```bash
cd /opt/tzdraft && docker compose -f docker-compose.prod.yml up -d backend
```

**Result:** ❌ Still did not work. Issue persists.

---

## Current State

All known fixes have been applied. What is confirmed working:

| Check | Status |
|-------|--------|
| nginx proxying HTTP → backend | ✅ |
| nginx WebSocket proxy headers set | ✅ |
| Polling transport (`transport=polling`) | ✅ 200 OK |
| Backend container running new image | ✅ |
| Gateway reads full CORS_ORIGINS list | ✅ (code deployed) |
| www added to CORS_ORIGINS .env | ✅ |

What is still failing:

| Check | Status |
|-------|--------|
| WebSocket transport through nginx | ❌ 400 |
| Browser WebSocket handshake | ❌ |

---

## What Needs Investigation Next

The issue is still not resolved. Remaining things to check:

### 1. Confirm the www origin was actually picked up after restart

After updating `.env` and restarting, verify the new container sees the updated env var:

```bash
docker exec $(docker ps -q --filter name=backend) env | grep CORS
```

Expected: `CORS_ORIGINS=https://tzdraft.co.tz,https://www.tzdraft.co.tz`

### 2. Check backend logs during a live WebSocket attempt

```bash
docker logs $(docker ps -q --filter name=backend) --tail 50 -f
```

Then attempt to connect from the browser and watch for any error/rejection logs.

### 3. Force the nginx www → non-www redirect to actually work

The cleanest long-term fix is to make the frontend only ever serve from the non-www domain. Confirm that visiting `https://www.tzdraft.co.tz` in a fresh browser tab correctly redirects to `https://tzdraft.co.tz` before any page loads. If it doesn't redirect, the nginx config may not have been reloaded properly.

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -I https://www.tzdraft.co.tz
# Expected: HTTP/1.1 301 → Location: https://tzdraft.co.tz/
```

### 4. Check if engine.io is rejecting due to namespace path

The gateway uses `namespace: 'games'`. The Socket.IO server creates the namespace at `/games`. Engine.io handles transport at the root level (`/socket.io/`), but if there is a conflict or misconfiguration in how NestJS registers the namespace, the handshake may fail at the protocol level.

Test: connect directly to the backend (bypassing nginx) from the VPS with the www origin:

```bash
curl -i "http://localhost:3002/socket.io/?EIO=4&transport=polling" \
  -H "Origin: https://www.tzdraft.co.tz"
```

If this returns `200` with `Access-Control-Allow-Origin: https://www.tzdraft.co.tz`, then the backend CORS is fine and the issue is in nginx stripping/modifying headers.

### 5. Check nginx is not stripping the Origin header

```bash
# Add a temporary debug header to nginx to confirm Origin reaches backend
# In location /socket.io/ block, add:
proxy_set_header X-Forwarded-Origin $http_origin;
# Then check backend logs for what origin it receives
```

---

## Files Changed

| File | Change |
|------|--------|
| `/etc/nginx/sites-available/tzdraft` (VPS) | Added WebSocket proxy block + www redirect |
| `backend/src/infrastructure/messaging/games.gateway.ts` | CORS_ORIGINS list + pubClient null guards |
| `/opt/tzdraft/.env` (VPS) | Added `https://www.tzdraft.co.tz` to CORS_ORIGINS |
