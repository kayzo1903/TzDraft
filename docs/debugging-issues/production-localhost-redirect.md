# Production Localhost Redirect — Root Cause & Fix

**Date:** 2026-03-08
**Severity:** Critical (site fully down)
**Symptoms:** `https://tzdraft.co.tz` returned `301 Moved Permanently → https://localhost:3000/`

---

## What Happened

### Root Cause 1 — HTTPS enforcement middleware broke behind nginx

Commit `abda2ad4` added an HTTPS redirect to `frontend/src/middleware.ts`:

```typescript
if (
  process.env.NODE_ENV === "production" &&
  req.headers.get("x-forwarded-proto") === "http" &&
  !req.headers.get("host")?.includes("localhost")
) {
  const httpsUrl = req.nextUrl.clone();
  httpsUrl.protocol = "https:";
  return NextResponse.redirect(httpsUrl, 301);
}
```

**Why it failed:** nginx terminates SSL and proxies to Next.js over plain HTTP on
`localhost:3000`. Without `X-Forwarded-Proto` set in the nginx frontend config,
Next.js received the internal HTTP connection. `req.nextUrl` was constructed as
`http://localhost:3000/` (the internal URL). When the middleware fired, cloning
that URL and setting `https:` produced `https://localhost:3000/` — which is
unreachable in production.

**Rule:** Never implement HTTPS enforcement inside the application when a reverse
proxy (nginx, Caddy, etc.) already handles TLS. The proxy is the right place for
HTTP → HTTPS redirects. nginx was already doing this correctly via `return 301
https://$host$request_uri`.

---

### Root Cause 2 — nginx frontend block was missing proxy headers

The nginx frontend server block was missing three headers that the API block had:

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Without `X-Forwarded-Proto $scheme`, Next.js could not know the outer connection
was HTTPS. This caused the middleware condition to trigger.

Also, `Connection upgrade` was a literal string instead of `Connection $http_upgrade`,
which breaks WebSocket proxying.

---

### Root Cause 3 — `NEXT_PUBLIC_*` vars were never reaching the Docker build

`deploy.yml` passed `${{ vars.NEXT_PUBLIC_API_URL }}` as a Docker build-arg, but
the `build-and-push` job did not have `environment: production`. GitHub Actions
`vars.*` are environment-scoped — without the environment declaration, the variable
expanded to empty string `""`.

Result: `NEXT_PUBLIC_API_URL` was baked into the JS bundle as `""`, making all
API calls hit the frontend origin (404s on every request).

---

### Root Cause 4 — `frontend/.env` committed with localhost values

`frontend/.env` was tracked in git with `NEXT_PUBLIC_API_URL=http://localhost:3002`.
This file is copied into the Docker image. If a build-arg override failed, the
localhost value could be baked into the bundle.

---

### Root Cause 5 — Backend `FRONTEND_URL` fallback was `localhost:3000`

Multiple backend files used this pattern:

```typescript
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
```

If `FRONTEND_URL` was empty or missing on the VPS, Google OAuth callbacks and
other redirects went to `localhost:3000` instead of the real domain.

---

## How It Was Fixed

### Immediate fix (nginx — no deploy needed)
Rewrote `/etc/nginx/sites-enabled/tzdraft` with a clean config adding the missing
proxy headers to the frontend block and fixing `Connection $http_upgrade`:

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Connection $http_upgrade;
```

Then: `sudo nginx -t && sudo systemctl reload nginx`

### Code fixes (deployed via CI)

| File | Change |
|------|--------|
| `frontend/src/middleware.ts` | Removed HTTPS redirect — reverted to plain `createMiddleware(routing)` |
| `frontend/.env` | Stripped all values — keys present but empty, so Docker build-args always win |
| `frontend/.env.example` | Updated to document the local dev pattern (`cp .env.example .env.local`) |
| `frontend/next.config.ts` | Guard now also rejects localhost values in production, not just missing vars |
| `backend/src/config/env.validation.ts` | `FRONTEND_URL` and `JWT_REFRESH_SECRET` made required; localhost URLs rejected in production |
| `backend/src/main.ts` | Removed `\|\| 'http://localhost:3000'` CORS fallback chain |
| `backend/src/auth/auth.controller.ts` | Removed localhost fallback for `FRONTEND_URL` |
| `backend/src/auth/guards/google-oauth.guard.ts` | Removed localhost fallback for `FRONTEND_URL` |
| `backend/src/infrastructure/messaging/games.gateway.ts` | Removed localhost fallback for `FRONTEND_URL` |
| `.github/workflows/deploy.yml` | Added `environment: production` to `build-and-push` job; added bash `${VAR:?}` guard before Docker build |
| `docker-compose.prod.yml` | Removed misleading `NEXT_PUBLIC_API_URL` runtime env (no effect on pre-built Next.js image) |

---

## Lessons Learned

### 1. Never implement HTTPS redirect at application level behind a proxy
nginx already enforces HTTP → HTTPS. Doing it again in Next.js middleware creates
a redirect loop or redirects to the internal URL instead of the public domain.

### 2. `NEXT_PUBLIC_*` vars are compile-time, not runtime
They are statically inlined into the JS bundle during `next build`. Setting them
as Docker runtime env vars (`environment:` in docker-compose) has no effect on a
pre-built image. They must be passed as `--build-arg` at image build time.

### 3. GitHub Actions `vars.*` require `environment:` on the job
Without `environment: production` on the job that reads `${{ vars.MY_VAR }}`,
the variable expands to empty string with no warning. Always declare the
environment on every job that uses environment-scoped variables or secrets.

### 4. `|| 'localhost'` fallbacks are production liabilities
Every fallback to a localhost URL is a silent failure waiting to happen. The
correct pattern is to crash loudly at startup if a required variable is missing.
Wrong config = hard fail immediately, not silent degradation.

### 5. Never commit `.env` files with real values
`frontend/.env` should only contain empty keys. Developers use `.env.local`
(gitignored) for local values. Production values come from CI build-args or
secrets managers only.
