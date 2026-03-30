# TzDraft Security Audit — 2026-03-30

## Overview

A full-stack security audit was performed on the TzDraft codebase (NestJS backend + Next.js frontend). All issues found were fixed in the same session. No external scanning tools were used — all findings are from manual code review.

---

## Findings & Fixes

### CRITICAL

| ID | Issue | File | Status |
|----|-------|------|--------|
| C-01 | Production secrets (JWT, DB password, API keys) stored in `.env` on disk | `.env` | **Manual action required** — rotate all secrets immediately; verify `.env` is in `.gitignore` |

> **.env is not committed to git** but the file exists on disk. Rotate: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL` password, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `BEAM_AFRICA_SECRET_KEY`.

---

### HIGH — Fixed

| ID | Issue | File | Fix Applied |
|----|-------|------|-------------|
| H-01 | IDOR — `POST /games/pvp` accepted arbitrary `blackPlayerId`, allowing any user to create a ranked game against any other user without consent | `game.controller.ts` | Endpoint removed entirely (unused by frontend; matchmaking uses queue flow) |
| H-02 | JWT tokens stored in `localStorage` — stealable by any XSS on the page | `auth-store.ts`, `axios.ts` | Migrated to httpOnly cookies only (see [Token Migration](#token-migration)) |
| H-03 | No rate limiting on `POST /games/invite` — spam could bloat the database | `game.controller.ts` | Added `@Throttle(10/min)` |
| H-04 | WebSocket voice chat (`voice:offer`, `voice:answer`, `voice:ice-candidate`) accepted `any`-typed payloads with no validation — arbitrary data relayed to opponent | `games.gateway.ts` | Added strict type validation, property allowlisting, and size limits (SDP ≤ 8 KB, candidate ≤ 2 KB) |

---

### MEDIUM — Fixed

| ID | Issue | File | Fix Applied |
|----|-------|------|-------------|
| M-01 | No rate limiting on `POST /games/invite/:code/join` | `game.controller.ts` | Added `@Throttle(20/min)` |
| M-02 | No rate limiting on `POST /tournaments/:id/register` | `tournament.controller.ts` | Added `@Throttle(5/min)` |
| M-03 | Pagination `skip`/`take` on `GET /games/history` used raw `parseInt()` with no bounds | `game.controller.ts` | Replaced with `ParseIntPipe` + `DefaultValuePipe`; clamped `skip ≥ 0`, `take ∈ [1, 100]` |
| M-04 | WebSocket `acceptDraw` error handler returned raw `err.message` to clients | `games.gateway.ts` | Returns generic `'Failed to end game as draw'`; full error still logged server-side |
| M-05 | WebSocket token not re-validated after connection — banned/logged-out users could keep playing | `ws-jwt.guard.ts` | Guard now reads cookie from WS handshake, accepting fresh token on every reconnect |

---

### LOW — Fixed

| ID | Issue | File | Fix Applied |
|----|-------|------|-------------|
| L-01 | Invite code only 6 chars (~1.3B combinations) | `create-game.use-case.ts` | Increased to 8 chars (~44B combinations) |
| L-02 | Missing security headers on Next.js frontend responses | `next.config.ts` | Added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` (prod) |
| L-03 | Missing security headers on backend API responses | `main.ts` | Added `frame-ancestors: 'none'`, HSTS (prod), `Referrer-Policy`, `Permissions-Policy` via helmet + custom middleware |
| L-04 | No audit logging for admin actions | `admin.controller.ts` | Structured audit log on `BAN_USER`, `UNBAN_USER`, `UPDATE_ROLE`, `CLEANUP_GUESTS` — captured by pino |

---

## Token Migration

**Before:** `accessToken` and `refreshToken` stored in `localStorage` via Zustand persist — readable by any JavaScript on the page.

**After:** Tokens live exclusively in httpOnly cookies set by the backend. JavaScript cannot read them.

### Changes made

**Backend:**
- `auth.controller.ts` — `POST /auth/login`, `POST /auth/register`, `POST /auth/guest` now set `accessToken` and `refreshToken` as `httpOnly; Secure; SameSite=None` cookies (SameSite=Lax in dev). Previously only the OAuth and refresh flows set cookies.
- `jwt.strategy.ts` — Passport JWT now extracts the token from the `accessToken` cookie first, falls back to `Authorization: Bearer` header for non-browser clients.
- `ws-jwt.guard.ts` — WebSocket auth reads `accessToken` cookie from the Socket.IO upgrade handshake headers first, then falls back to `handshake.auth.token` and `Authorization` header.

**Frontend:**
- `auth-store.ts` — Removed `accessToken` and `refreshToken` from Zustand state and from the persist partialize. Only `user` and `isAuthenticated` are persisted.
- `axios.ts` — Removed `Authorization` header interceptor. `withCredentials: true` ensures cookies are sent automatically. On 401, calls `POST /auth/refresh` with no body (cookie sent automatically); retries original request after server sets new cookies.
- `useSocket.ts` — Socket connects with `withCredentials: true` instead of passing token via `auth: { token }`. Cookies are sent on the HTTP upgrade handshake.
- `AuthInitializer.tsx` — New client component mounted in the locale layout. On every page load it calls `GET /auth/me` using the cookie, restoring the user object into Zustand state. Replaces the old persist-from-localStorage pattern.
- `auth-client.ts` — `setAuth(user)` now takes only the user object. Added `authClient.init()` for use by `AuthInitializer`.
- `oauth-callback/page.tsx` — Removed manual `localStorage.setItem` calls. After OAuth redirect, backend cookies are already set; page calls `/auth/me` to get user data.

### Cookie settings

```
httpOnly: true
secure:   true  (production) / false (dev)
sameSite: none  (production) / lax   (dev)
path:     /
```

> `SameSite=None` is required because the frontend (`tzdraft.co.tz`) and API are on different origins. `SameSite=Strict` or `Lax` would silently drop cookies on all cross-origin fetch requests.

---

## Dismissed / Won't Fix

| ID | Issue | Reason |
|----|-------|--------|
| D-01 | CSP on Next.js frontend | Next.js injects inline hydration scripts; a static CSP requires `'unsafe-inline'` which defeats the purpose. Proper CSP needs per-request nonces (future work). |
| D-02 | `SameSite=Strict` on auth cookies | Incorrect for cross-origin frontend/API setup — would break all cookie-based auth requests. `SameSite=None; Secure` is the correct configuration. |
| D-03 | Tokens in Zustand in-memory state | After migration to cookies, tokens are not stored in JS at all — no need for in-memory state either. |

---

## Remaining / Future Work

| Priority | Item |
|----------|------|
| High | Rotate all secrets in `.env` and production environment (C-01) |
| Medium | Implement nonce-based CSP on Next.js frontend to eliminate `unsafe-inline` |
| Medium | Add expiry (e.g. 24h) to invite codes |
| Low | Admin audit log database table (currently logs to pino only) |
| Low | Opening book for Sidra engine (reduces wasted search time on first 5–8 moves) |
