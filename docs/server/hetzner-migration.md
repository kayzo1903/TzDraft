# TzDraft — Hetzner Migration Guide

**Migration:** Vercel (frontend) + Render (backend) → Hetzner CX33 (everything)
**Database:** Supabase stays — nothing changes there
**Redis:** Will run as Docker container on Hetzner (free)
**Estimated time:** 3–4 hours

---

## Current state vs target state

```
CURRENT                              TARGET
──────────────────────────────────────────────────────────────
tzdraft.co.tz      → Vercel          tzdraft.co.tz     → Hetzner CX33
api.tzdraft.co.tz  → Render          api.tzdraft.co.tz → Hetzner CX33
Database           → Supabase        Database          → Supabase (unchanged)
Redis              → not set up      Redis             → Docker on Hetzner (free)
```

---

## Prerequisites — collect before starting

Do this before touching any server.

### From Render — copy your backend environment variables

Render dashboard → backend service → **Environment** tab → copy every variable:

```
DATABASE_URL          = postgresql://...supabase...
JWT_SECRET            = ...
BETTER_AUTH_SECRET    = ...
GOOGLE_CLIENT_ID      = ...
GOOGLE_CLIENT_SECRET  = ...
RESEND_API_KEY        = ...
RESEND_AUTH_DOMAIN    = ...
SUPPORT_EMAIL         = ...
BEAM_AFRICA_SENDER_ID = ...
BEAM_AFRICA_API_KEY   = ...
BEAM_AFRICA_SECRET_KEY= ...
SENTRY_DSN            = ...
```

> ⚠️ Do NOT regenerate any secrets. Users have active sessions using these exact values.
> Copy them exactly as they are.

### From Vercel — copy your frontend environment variables

Vercel dashboard → your project → **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_API_URL           = https://api.tzdraft.co.tz
NEXT_PUBLIC_BETTER_AUTH_URL   = https://tzdraft.co.tz
GOOGLE_CLIENT_ID              = ...
```

### Generate an SSH key on your Windows machine

Open **PowerShell**:

```powershell
ssh-keygen -t ed25519 -C "tzdraft-hetzner"
# Press Enter 3 times (accept all defaults)

# Copy your public key — you will paste this into Hetzner
cat C:\Users\YourName\.ssh\id_ed25519.pub
```

Save the output. It starts with `ssh-ed25519 AAAA...`

---

## Phase 1 — Create the Hetzner server

### 1.1 Create Hetzner account

1. Go to **hetzner.com/cloud**
2. Register with email → verify → add payment method
3. New accounts receive **€20 free credit** (~2 months free)

### 1.2 Create the server

1. Hetzner console → **+ New project** → name it `tzdraft`
2. Inside project → **Add server**
3. Fill in:

```
Location:   Helsinki or Nuremberg (closest to Tanzania via EU)
Image:      Ubuntu 24.04
Type:       Shared vCPU → Intel/AMD → CX33
            (4 vCPU · 8 GB RAM · 80 GB SSD · 20 TB bandwidth · ~€11/month)
SSH keys:   Add SSH key → paste your id_ed25519.pub content
Hostname:   tzdraft-prod
```

4. Click **Create & Buy now**
5. Wait ~30 seconds
6. **Copy the server IP address** (e.g. `65.21.100.200`) — you will use it everywhere below

### 1.3 Log into the server

```powershell
# PowerShell on your Windows machine:
ssh root@65.21.100.200
# Replace with your actual IP
# Type "yes" when asked about fingerprint
```

You should see: `root@tzdraft-prod:~#`

---

## Phase 2 — Secure and prepare the server

Run all of these on the Hetzner server.

### 2.1 Update the system

```bash
apt update && apt upgrade -y
```

### 2.2 Configure firewall

```bash
apt install ufw -y

ufw allow ssh          # port 22 — your terminal access
ufw allow 80           # HTTP — needed for SSL certificate setup
ufw allow 443          # HTTPS — your website

# Block everything else from the internet
ufw deny 3000          # frontend (nginx handles this)
ufw deny 3002          # backend  (nginx handles this)
ufw deny 5432          # postgres (not needed, using Supabase)
ufw deny 6379          # redis    (internal only)

ufw enable
# Type "y" to confirm
```

Verify:
```bash
ufw status
# Should show 22, 80, 443 as ALLOW
```

### 2.3 Install Docker

```bash
curl -fsSL https://get.docker.com | sh

# Verify
docker --version
docker compose version
```

### 2.4 Install nginx and Certbot (for SSL)

```bash
apt install nginx certbot python3-certbot-nginx -y
```

---

## Phase 3 — Configure nginx

nginx receives all web traffic and routes it to the correct Docker container.

```bash
# Remove the default nginx page
rm /etc/nginx/sites-enabled/default

# Create TzDraft nginx config
nano /etc/nginx/sites-available/tzdraft
```

Paste this (replace `tzdraft.co.tz` with your actual domain if different):

```nginx
# ── Frontend (tzdraft.co.tz) ──────────────────────────────────────────
server {
    listen 80;
    listen 443 ssl;
    server_name tzdraft.co.tz www.tzdraft.co.tz;

    # SSL — certbot will fill these in automatically
    ssl_certificate /etc/letsencrypt/live/tzdraft.co.tz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tzdraft.co.tz/privkey.pem;

    # Redirect HTTP → HTTPS
    if ($scheme = http) {
        return 301 https://$host$request_uri;
    }

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# ── Backend API (api.tzdraft.co.tz) ──────────────────────────────────
server {
    listen 80;
    listen 443 ssl;
    server_name api.tzdraft.co.tz;

    # SSL — certbot will fill these in automatically
    ssl_certificate /etc/letsencrypt/live/api.tzdraft.co.tz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tzdraft.co.tz/privkey.pem;

    # Redirect HTTP → HTTPS
    if ($scheme = http) {
        return 301 https://$host$request_uri;
    }

    # API + WebSocket (Socket.IO)
    location / {
        proxy_pass         http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;    # Keep WebSocket connections alive 1 hour
        proxy_send_timeout 3600s;
    }
}
```

Save: `Ctrl+X` → `Y` → `Enter`

```bash
# Enable the config
ln -s /etc/nginx/sites-available/tzdraft /etc/nginx/sites-enabled/

# Test syntax
nginx -t
# Expected: "syntax is ok" and "test is successful"

# Start nginx
systemctl reload nginx
```

---

## Phase 4 — Deploy TzDraft on Hetzner

### 4.1 Clone the repository

```bash
cd /opt
git clone https://github.com/YOUR-USERNAME/tzdraft.git tzdraft
cd /opt/tzdraft
```

### 4.2 Create the .env file

```bash
cp .env.example .env
nano .env
```

Fill in every value. Use the variables you collected from Render and Vercel:

```bash
# ── Database — Supabase (copy exactly from Render) ───────────────────
DATABASE_URL=postgresql://postgres:YOUR-SUPABASE-PASSWORD@db.xxxx.supabase.co:5432/postgres

# ── Redis — runs on this server in Docker ───────────────────────────
REDIS_URL=redis://redis:6379

# ── Auth — copy EXACTLY from Render (do not change) ─────────────────
JWT_SECRET=EXACT-VALUE-FROM-RENDER
BETTER_AUTH_SECRET=EXACT-VALUE-FROM-RENDER
JWT_EXPIRATION=7d

# ── URLs — update to your real domains ──────────────────────────────
APP_URL=https://tzdraft.co.tz
CORS_ORIGINS=https://tzdraft.co.tz,https://www.tzdraft.co.tz
NEXT_PUBLIC_API_URL=https://api.tzdraft.co.tz
NEXT_PUBLIC_BETTER_AUTH_URL=https://tzdraft.co.tz

# ── Google OAuth — copy from Render ─────────────────────────────────
GOOGLE_CLIENT_ID=EXACT-VALUE-FROM-RENDER
GOOGLE_CLIENT_SECRET=EXACT-VALUE-FROM-RENDER

# ── Email — Resend (copy from Render) ───────────────────────────────
RESEND_API_KEY=EXACT-VALUE-FROM-RENDER
RESEND_AUTH_DOMAIN=EXACT-VALUE-FROM-RENDER
SUPPORT_EMAIL=EXACT-VALUE-FROM-RENDER

# ── SMS — BeemAfrica (copy from Render) ─────────────────────────────
BEAM_AFRICA_SENDER_ID=EXACT-VALUE-FROM-RENDER
BEAM_AFRICA_API_KEY=EXACT-VALUE-FROM-RENDER
BEAM_AFRICA_SECRET_KEY=EXACT-VALUE-FROM-RENDER

# ── Sentry (copy from Render) ────────────────────────────────────────
SENTRY_DSN=EXACT-VALUE-FROM-RENDER

# ── Logging ──────────────────────────────────────────────────────────
LOG_LEVEL=info
NODE_ENV=production
```

Save: `Ctrl+X` → `Y` → `Enter`

### 4.3 Start the containers

```bash
# Build and start (Redis + backend + frontend only — Supabase handles DB)
docker compose up -d --build

# Watch startup logs (wait for "TzDraft server listening on port 3002")
docker compose logs -f backend
# Press Ctrl+C when you see the server is ready

# Verify all containers are running
docker compose ps
```

Expected output:
```
NAME                STATUS          PORTS
tzdraft-redis-1     Up (healthy)    0.0.0.0:6379->6379/tcp
tzdraft-backend-1   Up              0.0.0.0:3002->3002/tcp
tzdraft-frontend-1  Up              0.0.0.0:3000->3000/tcp
```

### 4.4 Test on IP address (before DNS switch)

```bash
# Test backend directly
curl http://localhost:3002/health
# Expected: {"status":"ok","info":{"database":{"status":"up"}}}
```

If database status is `up`, Supabase connection works.

---

## Phase 5 — Switch DNS

This is the moment traffic moves from Vercel/Render to Hetzner.

### 5.1 Find your DNS provider

Your domain `tzdraft.co.tz` DNS is managed in one of these places:
- **Vercel** (if you added domain directly in Vercel) → Vercel dashboard → Domains
- **Your domain registrar** (where you bought tzdraft.co.tz)
- **Cloudflare** (if you use Cloudflare)

### 5.2 Update DNS records

In your DNS provider, change these records:

```
Type    Name    Old value (Vercel/Render)    New value
──────────────────────────────────────────────────────────────
A       @       76.76.21.21 (Vercel IP)    → 65.21.100.200  (your Hetzner IP)
A       www     76.76.21.21 (Vercel IP)    → 65.21.100.200
A       api     Render IP                  → 65.21.100.200
```

> The old Vercel/Render IPs will look different — just replace them with your Hetzner IP.

### 5.3 Get SSL certificates

Wait ~5 minutes after DNS change, then run on Hetzner:

```bash
certbot --nginx \
  -d tzdraft.co.tz \
  -d www.tzdraft.co.tz \
  -d api.tzdraft.co.tz
```

Follow the prompts:
- Enter your email
- Type `Y` to agree to terms
- Certbot automatically updates nginx config with SSL

```bash
# Reload nginx with new SSL config
systemctl reload nginx
```

### 5.4 Verify DNS has propagated

```bash
# Run from your local Windows PowerShell:
nslookup tzdraft.co.tz
nslookup api.tzdraft.co.tz
# Both should show your Hetzner IP
```

### 5.5 Test everything on real domains

```powershell
# From Windows PowerShell:
curl https://api.tzdraft.co.tz/health
# Expected: {"status":"ok","info":{"database":{"status":"up"}}}
```

Open browser:
- `https://tzdraft.co.tz` → frontend loads ✅
- Login works ✅
- Start a game ✅
- WebSocket connects (no loading spinner) ✅

---

## Phase 6 — Shut down Vercel and Render

Only do this after Phase 5 is fully confirmed working.

### Remove project from Vercel

1. Vercel dashboard → your project → **Settings** → scroll to bottom
2. **Delete Project** → type project name to confirm

> Your domain DNS records will become orphaned — that's fine, they already point to Hetzner.

### Remove backend from Render

1. Render dashboard → backend service → **Settings** → scroll to bottom
2. **Delete Service** → confirm

### Result

```
Vercel:  deleted — no more charges
Render:  deleted — no more charges
Hetzner: running — ~€11/month for everything
```

---

## Phase 7 — Post-migration setup

### 7.1 Set up automatic database backups

```bash
chmod +x /opt/tzdraft/scripts/backup-db.sh

# Test it manually
bash /opt/tzdraft/scripts/backup-db.sh

# Add to cron — runs every day at 2:00 AM
crontab -e
# Add this line at the bottom:
0 2 * * * /bin/bash /opt/tzdraft/scripts/backup-db.sh >> /var/log/tzdraft-backup.log 2>&1
# Save: Ctrl+X → Y → Enter
```

### 7.2 Set up auto-renew SSL (runs automatically, just verify)

```bash
# Test the auto-renewal works
certbot renew --dry-run
# Should say: "Congratulations, all simulated renewals succeeded"
```

Certbot installs a cron that renews SSL every 90 days automatically.

### 7.3 Set up automatic deployment (optional)

Each time you push code, SSH in and run:

```bash
cd /opt/tzdraft
git pull origin main
docker compose up -d --build --no-deps backend frontend
```

---

## How to update the server after this (ongoing)

```bash
# SSH in
ssh root@65.21.100.200

# Pull latest code
cd /opt/tzdraft
git pull origin main

# Rebuild and restart (zero config change)
docker compose up -d --build --no-deps backend frontend

# If you changed database schema:
docker compose exec backend npx prisma migrate deploy
```

---

## Troubleshooting

### Backend won't start
```bash
docker compose logs backend | tail -50
```
Common causes:
- Wrong `DATABASE_URL` → check Supabase credentials
- Wrong `JWT_SECRET` / `BETTER_AUTH_SECRET` → copy from Render again
- Redis not ready → check `docker compose ps redis`

### Frontend shows blank page
```bash
docker compose logs frontend | tail -30
```
Check `NEXT_PUBLIC_API_URL` in `.env` matches `https://api.tzdraft.co.tz`

### WebSocket not connecting (games disconnect immediately)
Check nginx `proxy_read_timeout 3600s` is in the api.tzdraft.co.tz server block.

### SSL certificate fails
DNS may not have propagated yet. Wait 10 more minutes then retry:
```bash
certbot --nginx -d tzdraft.co.tz -d www.tzdraft.co.tz -d api.tzdraft.co.tz
```

### Check everything is working
```bash
# All containers running?
docker compose ps

# Backend healthy?
curl http://localhost:3002/health

# Redis working?
docker compose exec redis redis-cli PING

# nginx working?
nginx -t
```

---

## Full migration checklist

```
PREPARATION
  [ ] All Render environment variables saved locally
  [ ] All Vercel environment variables saved locally
  [ ] SSH key generated and public key copied

PHASE 1 — Hetzner server
  [ ] Hetzner account created
  [ ] CX33 server created (Ubuntu 24.04)
  [ ] SSH login works: ssh root@YOUR-IP

PHASE 2 — Server preparation
  [ ] apt update && apt upgrade ran
  [ ] ufw firewall configured (22, 80, 443 open)
  [ ] Docker installed
  [ ] nginx + certbot installed

PHASE 3 — nginx
  [ ] /etc/nginx/sites-available/tzdraft created
  [ ] nginx -t passes
  [ ] nginx reloaded

PHASE 4 — Deploy
  [ ] Repo cloned to /opt/tzdraft
  [ ] .env filled with all values from Render/Vercel
  [ ] docker compose up -d --build
  [ ] docker compose ps shows all 3 containers Up
  [ ] curl http://localhost:3002/health returns database: up

PHASE 5 — DNS switch
  [ ] DNS A records updated to Hetzner IP
  [ ] certbot ran — SSL certificates issued for all 3 domains
  [ ] nginx reloaded
  [ ] nslookup shows Hetzner IP for both domains
  [ ] https://tzdraft.co.tz loads
  [ ] https://api.tzdraft.co.tz/health returns 200
  [ ] Login works
  [ ] Game starts and WebSocket connects

PHASE 6 — Cleanup
  [ ] Vercel project deleted
  [ ] Render backend service deleted

PHASE 7 — Post migration
  [ ] Backup script tested manually
  [ ] Backup cron added (crontab -e)
  [ ] certbot renew --dry-run passes
```

---

## Monthly cost after migration

```
Hetzner CX33:           €10.90/month  (~$12)
Domain renewal:          varies        (~$1/month)
Supabase free tier:      $0
Redis (Docker on VPS):   $0
Vercel:                  $0  (deleted)
Render:                  $0  (deleted)
────────────────────────────────────────
Total infrastructure:   ~$12–13/month
```
