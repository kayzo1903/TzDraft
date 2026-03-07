# TzDraft — Production Runbook

**Last updated:** 2026-03-07

---

## 1. Deploy

### First-time deploy (staging or production)

```bash
# 1. SSH into the server
ssh user@your-server

# 2. Clone the repo
git clone https://github.com/your-org/tzdraft.git /opt/tzdraft
cd /opt/tzdraft

# 3. Copy and fill in environment variables
cp .env.example .env
nano .env   # Fill in all real values

# 4. Build and start
docker compose up -d --build

# 5. Run DB migrations
docker compose exec backend npx prisma migrate deploy

# 6. Verify
curl http://localhost:3002/health
```

### Routine deploy (code update)

```bash
cd /opt/tzdraft
git pull origin main
docker compose up -d --build --no-deps backend frontend
docker compose exec backend npx prisma migrate deploy
```

**Zero-downtime note:** The backend restarts in ~5s. Active WebSocket connections will drop and clients auto-reconnect. There is no rolling restart in the current setup.

---

## 2. Rollback

```bash
# Roll back to a specific commit
git log --oneline -10       # find the commit hash
git checkout <commit-hash>
docker compose up -d --build --no-deps backend frontend
# If the bad deploy included a DB migration, restore from backup first (see §5)
```

---

## 3. Restart services

```bash
# Restart everything
docker compose restart

# Restart only backend (e.g. after config change)
docker compose restart backend

# Full stop and start
docker compose down
docker compose up -d
```

---

## 4. Read logs

### Live logs (structured JSON via pino)

```bash
# All services
docker compose logs -f

# Backend only (prettified — requires pino-pretty locally)
docker compose logs -f backend | npx pino-pretty

# Filter for errors only
docker compose logs backend | grep '"level":50'   # level 50 = error

# Filter for a specific request ID
docker compose logs backend | grep '"reqId":"abc-123"'

# Filter for slow moves (> 200ms)
docker compose logs backend | grep 'move' | grep -v '"statusCode":200'
```

### Log levels (pino)
| Level | Value | When used |
|---|---|---|
| trace | 10 | Very verbose dev debug |
| debug | 20 | Dev — request details |
| info  | 30 | Normal production events |
| warn  | 40 | Recoverable issues |
| error | 50 | Exceptions, failed operations |
| fatal | 60 | App cannot continue |

Change log level at runtime via `LOG_LEVEL` env var + restart.

### Sentry (exceptions)
All unhandled exceptions are automatically sent to Sentry. Check the Sentry dashboard for stack traces, breadcrumbs, and affected users.

---

## 5. Database backup and restore

### Manual backup

```bash
# Run the backup script
bash scripts/backup-db.sh

# Backups are saved to /opt/tzdraft/backups/
ls -lh /opt/tzdraft/backups/
```

### Automated backups
A cron job runs `scripts/backup-db.sh` daily at 02:00 UTC. Check with:
```bash
crontab -l
```

### Restore from backup

```bash
# Stop the backend to prevent writes
docker compose stop backend

# Restore (replace the filename)
gunzip -c /opt/tzdraft/backups/tzdraft_2026-03-07_02-00.sql.gz \
  | docker compose exec -T postgres psql -U tzdraft -d tzdraft

# Restart
docker compose start backend
docker compose logs -f backend
```

---

## 6. Check app health

```bash
# HTTP health endpoint (DB connectivity)
curl -s http://localhost:3002/health | jq .

# Expected response:
# { "status": "ok", "info": { "database": { "status": "up" } } }

# Check all container status
docker compose ps

# Check resource usage
docker stats --no-stream
```

---

## 7. Common incidents

### Backend won't start

```bash
docker compose logs backend | tail -50
```

Common causes:
- `DATABASE_URL` wrong → `could not connect to server`
- Missing env var → NestJS config error on startup
- Prisma migration not run → schema mismatch error
- Port 3002 already in use → `EADDRINUSE`

### Sidra AI process pool exhausted

Symptom: AI moves take > 5s or return 500.

```bash
docker compose logs backend | grep -i sidra
```

Fix: restart backend to reinitialize the Sidra process pool:
```bash
docker compose restart backend
```

### Database connection pool exhausted

Symptom: `Timed out fetching a new connection from the pool` in logs.

Check active connections:
```bash
docker compose exec postgres psql -U tzdraft -c "SELECT count(*) FROM pg_stat_activity;"
```

Fix: restart backend (releases Prisma pool) or increase `DATABASE_URL` connection limit:
```
DATABASE_URL=postgresql://...?connection_limit=20
```

### WebSocket disconnects spike

Symptom: users report games disconnecting frequently.

Check gateway logs:
```bash
docker compose logs backend | grep -i "disconnect\|socket"
```

Common causes:
- Proxy timeout (Nginx/load balancer) — set `proxy_read_timeout 3600;`
- Server restart — clients auto-reconnect within 3s
- Memory pressure — check `docker stats`

### High memory usage

```bash
docker stats --no-stream
```

If backend > 500MB:
```bash
docker compose restart backend
```

If postgres > 1GB: check for long-running queries:
```bash
docker compose exec postgres psql -U tzdraft -c \
  "SELECT pid, age(clock_timestamp(), query_start), usename, query
   FROM pg_stat_activity
   WHERE query != '<IDLE>' AND query_start < now() - interval '5 minutes'
   ORDER BY query_start;"
```

---

## 8. Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `POSTGRES_PASSWORD` | ✅ (docker) | Password for local postgres container |
| `JWT_SECRET` | ✅ | Must be a long random string in production |
| `BETTER_AUTH_SECRET` | ✅ | Must be a long random string in production |
| `APP_URL` | ✅ | Frontend base URL (for OAuth callbacks) |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth (leave blank to disable) |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth |
| `RESEND_API_KEY` | Optional | Email sending (leave blank to disable) |
| `BEAM_AFRICA_API_KEY` | Optional | SMS OTP (leave blank to disable) |
| `SENTRY_DSN` | Optional | Error tracking (leave blank to disable) |
| `LOG_LEVEL` | Optional | `info` default. `debug` for verbose. |

---

## 9. Useful commands cheatsheet

```bash
# View running containers
docker compose ps

# Open a shell in the backend container
docker compose exec backend sh

# Run Prisma Studio (DB GUI) in the container
docker compose exec backend npx prisma studio

# Manually trigger a database backup
bash /opt/tzdraft/scripts/backup-db.sh

# Run the load test against staging
k6 run --env BASE_URL=https://staging.tzdraft.com load-tests/k6/game-load-test.js

# Check disk usage (backups)
du -sh /opt/tzdraft/backups/*
```
