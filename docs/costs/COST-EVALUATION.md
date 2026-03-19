# TzDraft — Minimum Cost Evaluation

**Date:** 2026-03-07
**Audience:** Owner / operator planning production launch

---

## ⚠️ Critical blocker before costing anything

**The Sidra AI engine only exists as a Windows binary.**

```
engines/sidra/cli/sidra-cli.exe   ← Windows only (.exe)
engines/sidra/cli/SiDra.dll       ← Windows only (.dll)
No .so or ELF binary exists.
```

Every affordable Linux hosting platform (Railway, Render, Fly.io, Hetzner VPS, DigitalOcean)
runs Ubuntu/Debian. Sidra **will not start** on Linux. The backend logs a warning and continues,
but **AI games against Sidra will fail** for all players.

### Your two options

| Option | Cost impact | What to do |
|---|---|---|
| **A — Compile Sidra for Linux** | $0 extra | Install g++ on your dev machine or CI, compile the C++ source for Linux. AI games work everywhere. |
| **B — Windows-only hosting** | +$15–50/month more | Use an Azure Windows VM or similar. Expensive and harder to manage. |
| **C — Disable Sidra in production** | $0 extra | Only CAKE engine (TypeScript, browser-side) is available. AI games work but use the weaker engine. |

**Recommendation: Option A.** Compile Sidra for Linux in CI before deploying.
The C++ source is already in `engines/sidra/`. It will likely compile with one command.

---

## Infrastructure needed

| Component | Technology | Notes |
|---|---|---|
| Backend | NestJS (Node.js) | WebSocket + HTTP, port 3002 |
| Frontend | Next.js (SSR) | Server-rendered React, port 3000 |
| Database | PostgreSQL 16 | Game records, users, ratings |
| Cache/Queue | Redis 7 | Matchmaking queue + game state cache |
| AI engine | Sidra CLI (C++) | 4 pre-warmed processes, port-less |

**Minimum RAM estimate per service:**

| Service | Minimum | Comfortable |
|---|---|---|
| Backend (+ 4 Sidra processes) | 512 MB | 1 GB |
| Frontend (Next.js SSR) | 256 MB | 512 MB |
| PostgreSQL | 256 MB | 512 MB |
| Redis | 32 MB | 128 MB |
| **Total** | **~1.1 GB** | **~2.2 GB** |

---

## Option 1 — Single VPS (cheapest, most control)

Run everything on one server. Best value per dollar.

### Hetzner Cloud (European provider, excellent quality)

| Plan | vCPU | RAM | Storage | Bandwidth | Monthly |
|---|---|---|---|---|---|
| CX22 | 2 | 4 GB | 40 GB | 20 TB | **€3.92 (~$4.30)** |
| CX32 | 4 | 8 GB | 80 GB | 20 TB | **€7.92 (~$8.70)** |

- CX22 is enough for up to ~200 concurrent users
- CX32 handles ~500–1000 concurrent users

### DigitalOcean (if you prefer an English-first panel)

| Plan | vCPU | RAM | Storage | Bandwidth | Monthly |
|---|---|---|---|---|---|
| Basic | 1 | 1 GB | 25 GB | 1 TB | **$6** |
| Basic | 1 | 2 GB | 50 GB | 2 TB | **$12** |
| Basic | 2 | 2 GB | 60 GB | 3 TB | **$18** |

The $12 plan is the minimum for TzDraft (1 GB is too tight with all 4 services).

### VPS setup work required (one-time, ~2 hours)
- Install Docker + Docker Compose
- Set up nginx as reverse proxy (HTTPS + WebSocket)
- Configure Let's Encrypt SSL (free)
- Add firewall rules (ufw)
- Set up cron for database backups

**VPS minimum cost: $4.30–$12/month**

---

## Option 2 — Fly.io + Supabase + Upstash (managed services, easy deploy)

No server to manage. Each service is independent. Scale each piece separately.

| Service | Provider | Plan | Monthly |
|---|---|---|---|
| Backend (NestJS) | Fly.io | shared-cpu-1x, 512MB | **$3.19** |
| Frontend (Next.js) | Fly.io | shared-cpu-1x, 256MB | **$1.94** |
| PostgreSQL | Supabase | Free (500 MB DB) | **$0** |
| Redis | Upstash | Free (10K cmd/day) | **$0** |
| **Total** | | | **~$5.13/month** |

**Supabase free tier limits:**
- 500 MB database storage
- 2 GB file storage
- 50,000 monthly active users
- Pauses after 1 week of inactivity (on free)

**Upstash free tier limits:**
- 10,000 Redis commands/day
- 256 MB data max
- TzDraft at 50 concurrent users uses ~5,000 commands/day — fits in free tier

**When free tiers won't be enough:**

| Service | Paid plan price | When you need it |
|---|---|---|
| Supabase Pro | **$25/month** | >500MB DB or project active >1 week (production) |
| Upstash Pay-as-you-go | **$0.20/100K commands** | >10K commands/day (>50 concurrent users) |

**Fly.io minimum cost: $5.13/month → $30/month (with paid Supabase)**

---

## Option 3 — Railway (simplest deployment, higher cost)

One command deploy. Good developer experience. More expensive than Fly.io.

| Service | Monthly estimate |
|---|---|
| Backend | $10–15 |
| Frontend | $5–10 |
| PostgreSQL (Railway) | $5 |
| Redis (Railway) | $5 |
| Hobby plan fee | $5 |
| **Total** | **~$30–40/month** |

---

## Option 4 — Render (similar to Railway)

| Service | Plan | Monthly |
|---|---|---|
| Backend | Starter (512MB) | $7 |
| Frontend | Starter (512MB) | $7 |
| PostgreSQL | Starter (1GB) | $7 |
| Redis | Starter | $10 |
| **Total** | | **~$31/month** |

Render free tier: services sleep after 15 minutes of inactivity. Not viable for production.

---

## External services cost

These are costs beyond your hosting infrastructure.

| Service | Usage | Cost |
|---|---|---|
| Domain name | 1 domain (e.g. tzdraft.com) | **$10–15/year** (~$1.25/month) |
| SSL certificate | Let's Encrypt | **Free** |
| Email (Resend) | Up to 3,000 emails/month | **Free** |
| Email (Resend) | 3,000–50,000/month | **$20/month** |
| SMS OTP (BeemAfrica) | Per SMS in Tanzania | **~TZS 50/SMS** (~$0.02/SMS) |
| Google OAuth | Authentication | **Free** |
| Sentry error tracking | Up to 5,000 errors/month | **Free** |
| GitHub | Code hosting + CI/CD | **Free** |

### SMS cost warning ⚠️

If you use phone OTP for signup/login, SMS costs add up quickly.

| Daily OTP requests | Monthly SMS cost |
|---|---|
| 50 OTPs/day | ~$30/month |
| 100 OTPs/day | ~$60/month |
| 500 OTPs/day | ~$300/month |

**Tip:** Consider making Google OAuth the default login and OTP only as a fallback. This dramatically reduces SMS costs.

---

## Recommended setup by stage

### Stage 1 — MVP / Friends & family testing
**Goal:** Get it running, test everything, fix bugs. <50 users.

```
Fly.io backend    (512 MB)   = $3.19/month
Fly.io frontend   (256 MB)   = $1.94/month
Supabase Postgres (free)     = $0/month
Upstash Redis     (free)     = $0/month
Domain                       = $1.25/month
────────────────────────────────────────
Total                        ≈ $6.38/month
```

**Best for:** Proving the product works before investing more.

---

### Stage 2 — Soft launch (paying users or public beta)
**Goal:** Reliable, 24/7 uptime, up to 200 concurrent users.

```
Hetzner CX22 VPS (2 vCPU, 4GB)  = $4.30/month
Supabase Pro (no pausing)        = $25/month   ← or use Postgres on VPS ($0)
Upstash Pay-as-you-go Redis      = ~$2/month   ← or use Redis on VPS ($0)
Domain                           = $1.25/month
────────────────────────────────────────────────
Option A (all on VPS):           ≈ $5.55/month
Option B (VPS + managed DB):     ≈ $32.55/month
```

**Recommendation:** Run PostgreSQL and Redis on the VPS too. All 4 services fit in 4 GB RAM with room to spare. Managed databases add reliability but you already have a backup script.

---

### Stage 3 — Growth (500–2,000 concurrent users)
**Goal:** Handle real load without single server becoming a bottleneck.

```
Hetzner CX32 VPS or 2× CX22     = $8.70–$8.60/month
OR: Fly.io with 2 backend instances = ~$15/month
Supabase Pro                     = $25/month
Upstash Redis                    = $5–20/month
Load balancer (if needed)        = $10–20/month
────────────────────────────────────────────────
Total                            ≈ $50–70/month
```

---

## Cost summary table

| Setup | Users | Monthly cost | Sidra AI? |
|---|---|---|---|
| Fly.io + free DBs | 0–50 | **~$6/month** | After Linux compile |
| Single VPS (Hetzner CX22) | 0–200 | **~$5–6/month** | After Linux compile |
| Single VPS (Hetzner CX32) | 200–1000 | **~$9/month** | After Linux compile |
| Railway / Render | 0–200 | **~$30–40/month** | After Linux compile |
| Windows Azure VM | Any | **~$50+/month** | Works without compile |

---

## What to do first (action plan)

### Before spending any money

**1. Fix the Sidra Linux build (1–2 hours)**
```bash
# On a Linux machine or WSL:
cd engines/sidra
sudo apt install g++ make -y
# Compile the source (check if a Makefile exists, or compile manually)
```

**2. Test the Docker build locally**
```bash
docker compose up --build
# Verify all 4 services start: redis, postgres, backend, frontend
curl http://localhost:3002/health
```

**3. Set strong secrets in .env**
```bash
# Generate secrets:
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # BETTER_AUTH_SECRET
openssl rand -base64 32   # POSTGRES_PASSWORD
openssl rand -base64 32   # REDIS_PASSWORD (if you add one)
```

### Minimum viable launch (in order)

1. **Register a domain** ($10–15/year) — pick a registrar like Namecheap or Cloudflare
2. **Spin up a Hetzner CX22** ($4.30/month) — cheapest reliable server
3. **Install Docker + nginx on the server** (30 min, one-time)
4. **Set up SSL with Let's Encrypt** (free, 10 min)
5. **Clone repo, fill .env, run docker compose up** (20 min)
6. **Point domain DNS to server IP** (5 min + up to 1 hr propagation)
7. **Run the backup cron** (already scripted in `scripts/backup-db.sh`)

**Total time to first launch: ~3–4 hours**
**Total cost: ~$5.55/month + $15 domain**

---

## Monthly budget worksheet

Fill in what applies to you:

```
INFRASTRUCTURE
  Server / hosting:         $ ______
  PostgreSQL (if managed):  $ ______
  Redis (if managed):       $ ______
  Domain:                   $ ______   (divide annual cost by 12)

EXTERNAL SERVICES
  Email (Resend):           $ ______   (free under 3K emails/month)
  SMS OTP (BeemAfrica):     $ ______   (# OTPs/month × $0.02)
  Sentry (error tracking):  $ ______   (free tier is enough)

ESTIMATED TOTAL:            $ ______
```

**Realistic minimum for a real production launch:**
- Best case (single VPS, low SMS usage): **$7–10/month**
- Typical (managed Postgres, moderate SMS): **$35–60/month**
- Growth phase: **$70–150/month**
