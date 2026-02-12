# Deploy Backend on a VPS (Hetzner) + Supabase Postgres

This roadmap deploys the **NestJS backend** from this repo onto a Hetzner VPS, serves it at `https://api.tzdraft.co.tz`, and keeps the database on **Supabase Postgres**.

Assumptions:
- Frontend is deployed separately (e.g. Vercel) at `https://tzdraft.co.tz`.
- Backend runs as a long-lived Node process behind **Nginx**.
- OS: Ubuntu 22.04 / 24.04 (similar steps for Debian).

---

## Phase 0: Prereqs (Accounts + Domains)

1. Buy/own the domain `tzdraft.co.tz`.
2. Create a Supabase project and get the **connection string** (use a pooled URL if available).
3. Create a Google OAuth client:
   - Authorized redirect URI: `https://api.tzdraft.co.tz/auth/google/callback`
4. Decide where DNS is managed (Cloudflare recommended).

---

## Phase 1: Provision the Hetzner VPS

1. Create a VPS (Hetzner Cloud) with Ubuntu.
2. SSH in as root, then create a non-root deploy user:
   - `adduser deploy`
   - `usermod -aG sudo deploy`
3. Basic hardening:
   - Disable password SSH auth, use SSH keys
   - Enable firewall (UFW): allow `OpenSSH`, `80`, `443`

---

## Phase 2: DNS for `api.tzdraft.co.tz`

Point the subdomain to your VPS:

- Record: `A`
- Name/Host: `api`
- Value/Target: `<your VPS public IPv4>`
- TTL: Auto/Default

Wait for propagation before issuing TLS certificates.

---

## Phase 3: Install System Dependencies

On the VPS:

1. Install Node.js (LTS) and pnpm.
2. Install Nginx.
3. Install certbot for Let’s Encrypt.

Notes:
- Keep Node on an LTS line (20/22). Avoid “random latest” on servers.
- Prisma requires a working OpenSSL runtime (standard on Ubuntu).

---

## Phase 4: Deploy the Backend (Monorepo)

### 4.1 Clone repo

Pick a directory, e.g. `/opt/tzdraft`:

- `sudo mkdir -p /opt/tzdraft`
- `sudo chown -R deploy:deploy /opt/tzdraft`
- `cd /opt/tzdraft`
- `git clone <YOUR_REPO_URL> .`

### 4.2 Configure backend environment variables

Create `/opt/tzdraft/backend/.env` with at least:

```env
NODE_ENV=production

# Public origins
FRONTEND_URL=https://tzdraft.co.tz
CORS_ORIGIN=https://tzdraft.co.tz
COOKIE_DOMAIN=.tzdraft.co.tz
BACKEND_URL=https://api.tzdraft.co.tz

# Auth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Database (Supabase)
DATABASE_URL=postgresql://...  # keep secret, prefer pooled URL
```

Optional (only if you use these features):

```env
# Email (support form)
RESEND_API_KEY=...
RESEND_AUTH_DOMAIN=...
SUPPORT_EMAIL=...

# SMS OTP
BEAM_AFRICA_API_KEY=...
BEAM_AFRICA_SECRET_KEY=...
BEAM_AFRICA_SENDER_ID=TzDraft
```

Important:
- Do **not** store these in Git.
- Rotate secrets if they were ever pasted publicly.

### 4.3 Install + build

From repo root (`/opt/tzdraft`):

- `corepack enable`
- `pnpm install --frozen-lockfile`
- `pnpm --filter ./backend... run build`

### 4.4 Run Prisma migrations (production)

If you have migrations committed (recommended):

- `pnpm --filter ./backend... exec prisma migrate deploy`

If you don’t have migrations, create them locally first and commit them before going production.

---

## Phase 5: Run Backend as a Service (systemd)

Create a systemd unit, e.g. `/etc/systemd/system/tzdraft-api.service`:

```ini
[Unit]
Description=TzDraft API (NestJS)
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/tzdraft/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/env node /opt/tzdraft/backend/dist/src/main.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable + start:
- `sudo systemctl daemon-reload`
- `sudo systemctl enable --now tzdraft-api`
- `sudo systemctl status tzdraft-api`

Logs:
- `journalctl -u tzdraft-api -f`

---

## Phase 6: Nginx Reverse Proxy (+ WebSockets)

Create `/etc/nginx/sites-available/api.tzdraft.co.tz`:

```nginx
server {
  listen 80;
  server_name api.tzdraft.co.tz;

  location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;

    # WebSocket / socket.io support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable it:
- `sudo ln -s /etc/nginx/sites-available/api.tzdraft.co.tz /etc/nginx/sites-enabled/`
- `sudo nginx -t`
- `sudo systemctl reload nginx`

---

## Phase 7: HTTPS (Let’s Encrypt)

Issue a cert:
- `sudo certbot --nginx -d api.tzdraft.co.tz`

Confirm auto-renew:
- `sudo systemctl status certbot.timer`

---

## Phase 8: Connect Frontend (Vercel)

On Vercel (frontend project env vars):

```env
NEXT_PUBLIC_API_URL=https://api.tzdraft.co.tz
NEXT_PUBLIC_SITE_URL=https://tzdraft.co.tz
```

---

## Phase 9: Production Checklist

- `https://api.tzdraft.co.tz/auth/google` starts Google flow
- Google redirects to `https://api.tzdraft.co.tz/auth/google/callback`
- After consent, you end up on `https://tzdraft.co.tz/auth/oauth-callback`
- Browser has httpOnly cookies set for `.tzdraft.co.tz`
- API accepts credentialed requests from `https://tzdraft.co.tz` (CORS + cookies)

---

## Phase 10: Updating/Deploying New Code

On the VPS:

- `cd /opt/tzdraft`
- `git pull`
- `pnpm install --frozen-lockfile`
- `pnpm --filter ./backend... run build`
- `pnpm --filter ./backend... exec prisma migrate deploy`
- `sudo systemctl restart tzdraft-api`

---

## Troubleshooting Tips

- 502 from Nginx: check `sudo systemctl status tzdraft-api` and `journalctl -u tzdraft-api -f`
- OAuth redirect mismatch: ensure `BACKEND_URL=https://api.tzdraft.co.tz` and Google redirect URI matches exactly
- Cookies not set: confirm HTTPS, `NODE_ENV=production`, correct `COOKIE_DOMAIN`, and `CORS_ORIGIN` points to the frontend

