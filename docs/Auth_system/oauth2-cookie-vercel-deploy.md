# OAuth2 (Google) Cookie Flow + Vercel Deployment

This document describes the **production-friendly Google OAuth2 flow** used in this repo:

- Backend is the **only** Google redirect target.
- Backend exchanges the `code` for tokens.
- Backend sets **httpOnly cookies** and redirects to the frontend (no tokens in the URL).
- Frontend finishes sign-in by calling `/auth/refresh` (cookie-based), then `/auth/me`.

It also documents how to deploy the **frontend on Vercel** using `tzdraft.co.tz`, with the API on a subdomain like `api.tzdraft.co.tz`.

## Recommended Domains

- Frontend: `https://tzdraft.co.tz` (or `https://app.tzdraft.co.tz`)
- Backend API: `https://api.tzdraft.co.tz`

This separation makes caching/CDN rules easier, limits API exposure on the main domain, and keeps OAuth redirect URIs unambiguous.

## Runtime Flow (What Happens)

1. User clicks "Continue with Google" in the frontend.
2. Browser navigates to backend: `GET https://api.tzdraft.co.tz/auth/google`
3. Google prompts the user, then redirects to:
   `GET https://api.tzdraft.co.tz/auth/google/callback?code=...`
4. Backend:
   - validates the Google profile
   - creates/updates the user
   - generates access/refresh tokens
   - sets cookies: `accessToken` and `refreshToken` (httpOnly)
   - redirects to frontend: `302 https://tzdraft.co.tz/auth/oauth-callback`
5. Frontend `/auth/oauth-callback`:
   - calls `POST /auth/refresh` (no body required in cookie-mode)
   - stores returned tokens (current code still uses localStorage for API calls)
   - calls `GET /auth/me`
   - redirects user to `/`

## Repo Implementation

- Backend OAuth callback sets cookies then redirects:
  - `backend/src/auth/auth.controller.ts`
  - route: `GET /auth/google/callback`
- Backend refresh supports either body token or cookie token:
  - `backend/src/auth/auth.controller.ts`
  - route: `POST /auth/refresh`
- Frontend callback exchanges cookie for tokens if query params are missing:
  - `frontend/src/app/[locale]/auth/oauth-callback/page.tsx`

## Google Cloud Console Setup

Create an OAuth Client ID of type **Web application**.

### Authorized JavaScript origins

- `https://tzdraft.co.tz`
- If you use `www`: `https://www.tzdraft.co.tz`
- If you use an app subdomain: `https://app.tzdraft.co.tz`

### Authorized redirect URIs

- `https://api.tzdraft.co.tz/auth/google/callback`

## Backend Environment Variables (Production)

Set these in your backend hosting platform:

- `NODE_ENV=production`
- `PORT=3002` (or whatever your host uses)
- `BACKEND_URL=https://api.tzdraft.co.tz`
- `FRONTEND_URL=https://tzdraft.co.tz`
- `COOKIE_DOMAIN=.tzdraft.co.tz`
- `CORS_ORIGIN=https://tzdraft.co.tz`
- `GOOGLE_CLIENT_ID=...apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET=GOCSPX-...`
- `JWT_SECRET=...`
- `DATABASE_URL=...`

Notes:
- `COOKIE_DOMAIN=.tzdraft.co.tz` allows cookies to be shared with subdomains.
- Cookies are sent only over HTTPS when `NODE_ENV=production` (because `secure: true`).
- `BACKEND_URL` must match your public API origin used by Google OAuth (and your redirect URI).

## Frontend Environment Variables (Vercel)

In Vercel Project Settings -> Environment Variables, set:

- `NEXT_PUBLIC_API_URL=https://api.tzdraft.co.tz`
- `NEXT_PUBLIC_SITE_URL=https://tzdraft.co.tz`

If you also use other public URLs, keep them consistent with the production domain.

## Deploy Frontend on Vercel

1. Push your repo to GitHub.
2. In Vercel: "New Project" -> import the repo.
3. Set the **Root Directory** to `frontend`.
4. Build settings:
   - Install command: `pnpm install`
   - Build command: `pnpm build`
   - Output: Vercel auto-detects Next.js
5. Add environment variables:
   - `NEXT_PUBLIC_API_URL=https://api.tzdraft.co.tz`
6. Add the custom domain:
   - Vercel Project -> Settings -> Domains
   - Add `tzdraft.co.tz` (and optionally `www.tzdraft.co.tz`)
   - Update your DNS at your registrar:
     - Typically `A` record for apex and `CNAME` for `www` (follow Vercel's instructions).

## Deploy Backend (API)

Vercel is excellent for the Next.js frontend. For the Nest backend, the simplest production approach is to run it as a long-lived service:

- A VPS (nginx + systemd)
- Render / Fly.io / Railway (anywhere you can run a Node server)

Once deployed, map it to:

- `api.tzdraft.co.tz` -> your backend host

Make sure the backend is served over HTTPS (required for secure cookies).

## Common Production Pitfalls

- `invalid_client`: wrong `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` pair.
- `redirect_uri_mismatch`: Google Console redirect URI does not exactly match the backend callback.
- Cookies not set/sent:
  - backend not on HTTPS in production
  - `COOKIE_DOMAIN` missing or wrong
  - CORS misconfigured (must allow credentials + origin)
- Tokens in URL:
  - avoid query-token redirects in production; use cookie flow.

## Quick Self-Check

- Visiting `https://api.tzdraft.co.tz/auth/google` should start the Google flow.
- After consent, you should end up at `https://tzdraft.co.tz/auth/oauth-callback` (frontend), not stuck on the backend callback page.
- In browser devtools -> Application/Storage:
  - backend domain should set `accessToken` and `refreshToken` cookies (httpOnly).
