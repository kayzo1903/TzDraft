#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TzDraft — PostgreSQL backup script
#
# Usage:
#   bash scripts/backup-db.sh
#
# What it does:
#   1. Dumps the tzdraft database to a gzip-compressed SQL file
#   2. Saves it to ./backups/ (created if missing)
#   3. Deletes backups older than 30 days
#   4. Prints a summary line to stdout
#
# Cron (daily at 02:00 UTC — add via `crontab -e`):
#   0 2 * * * /bin/bash /opt/tzdraft/scripts/backup-db.sh >> /var/log/tzdraft-backup.log 2>&1
#
# Environment variables (read from shell env or .env file):
#   POSTGRES_USER     — defaults to "tzdraft"
#   POSTGRES_DB       — defaults to "tzdraft"
#   POSTGRES_PASSWORD — required when connecting to a remote host
#   POSTGRES_HOST     — defaults to "localhost" (or "postgres" inside docker)
#   BACKUP_DIR        — defaults to ./backups
#   BACKUP_RETAIN_DAYS — defaults to 30
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present (for local / docker-compose use)
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

DB_USER="${POSTGRES_USER:-tzdraft}"
DB_NAME="${POSTGRES_DB:-tzdraft}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"

TIMESTAMP="$(date -u +%Y-%m-%d_%H-%M)"
FILENAME="${DB_NAME}_${TIMESTAMP}.sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

# ─── Run ─────────────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"

# Export password for pg_dump (avoids interactive prompt)
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup → $FILEPATH"

# If running inside docker-compose, use the postgres container
if docker compose ps postgres 2>/dev/null | grep -q "running"; then
  docker compose exec -T postgres pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    | gzip > "$FILEPATH"
else
  # Direct connection (staging/production with external Postgres)
  pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    | gzip > "$FILEPATH"
fi

SIZE="$(du -sh "$FILEPATH" | cut -f1)"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup complete — $FILENAME ($SIZE)"

# ─── Rotate old backups ───────────────────────────────────────────────────────

DELETED="$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${RETAIN_DAYS}" -print -delete | wc -l | tr -d ' ')"
if [[ "$DELETED" -gt 0 ]]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Rotated $DELETED backup(s) older than ${RETAIN_DAYS} days"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────

TOTAL="$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l | tr -d ' ')"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup dir contains $TOTAL file(s)"
