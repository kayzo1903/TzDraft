# TzDraft Dashboard Specification

Last updated: 2026-03-07
Owner: Engineering / Operations
Status: Draft v1

## 1. Purpose

Define the minimum production dashboard and alerts required to operate TzDraft safely.

Primary outcomes:
- Detect incidents early (queue failures, websocket drops, auth issues).
- Reduce MTTR with actionable signals.
- Track player-impacting performance in real time.

## 2. Scope

This spec covers:
- Backend API (NestJS)
- WebSocket gateway (Socket.IO)
- Redis (matchmaking + game cache)
- PostgreSQL
- Frontend (Next.js) client errors and user experience

This spec does not cover:
- Product analytics deep dives
- Financial dashboards
- Store/mobile telemetry (separate spec)

## 3. Dashboard Tooling (Recommended)

- Metrics: Prometheus + Grafana
- Error tracking: Sentry (already integrated)
- Logs: pino JSON logs, queryable in a log backend (Loki/Elastic/Cloud logs)

Minimum acceptable fallback:
- Sentry + provider dashboards (Render/Railway/Postgres/Redis) + manual runbook checks

## 4. Dashboard Layout

Create 4 dashboards:

1. Executive Health (single-screen)
2. Realtime Gameplay Ops
3. Infrastructure and Capacity
4. Errors and Regressions

## 5. Executive Health Dashboard

Refresh: 30s
Time window default: last 1 hour

Panels:
- API uptime (%)
- `/health` status by environment
- p95 API latency (ms)
- HTTP 5xx rate (%)
- Active websocket connections
- Matchmaking success rate (% matched within 10s)
- Queue depth by time control (1m/5m/10m)
- Active games count
- Redis availability + memory usage %
- Postgres connection usage %
- Sentry new issues (last 60m)

Traffic-light thresholds:
- Green: all SLOs within target
- Yellow: warning threshold breached for >= 5m
- Red: critical threshold breached for >= 2m

## 6. Realtime Gameplay Ops Dashboard

Goal: monitor gameplay integrity and matchmaking health.

Panels:
- Queue joins per minute
- Queue cancels per minute
- Match found per minute
- Queue wait time p50/p95
- Queue timeout/expiry count
- Matchmaking claim failures (Lua claim miss rate)
- Move submissions per minute
- Move ACK latency p50/p95
- Game state sync errors
- Disconnect events per minute
- Reconnect success rate (% reconnect <= 10s)
- Auto-resign events due to disconnect timeout

Required labels:
- `env`
- `time_control_ms`
- `region` (if multi-region later)

## 7. Infrastructure and Capacity Dashboard

Goal: detect saturation before users are impacted.

Panels:
- Backend CPU %, memory RSS, container restarts
- Event loop lag p95 (Node)
- Request throughput (RPS)
- Postgres CPU %, memory, disk usage %
- Postgres connection count / max
- Slow queries count (> 500ms)
- Redis used memory %, evicted keys, rejected connections
- Redis command latency p95
- Network egress (for cost monitoring)
- Disk usage for backups/logs

## 8. Errors and Regressions Dashboard

Goal: catch regressions and triage quickly.

Panels:
- Sentry error events/min by service
- Top 10 exception types (backend/frontend)
- Auth failure rate (login/signup/refresh)
- 4xx vs 5xx split
- WebSocket handler error count by event name
- Prisma errors by code
- External provider failures:
  - OAuth provider failures
  - Email provider failures
  - SMS provider failures

## 9. Alert Rules (v1)

Define these as pager alerts.

Critical (page immediately):
- API uptime < 99% for 5m
- HTTP 5xx > 5% for 5m
- p95 API latency > 1500ms for 10m
- Match success rate < 80% for 10m
- Redis down > 1m
- Postgres down > 1m
- WebSocket reconnect success < 70% for 10m

Warning (slack/email):
- Queue p95 wait time > 30s for 10m
- Redis memory > 80% for 15m
- Postgres connections > 80% for 10m
- Error rate doubled vs previous 24h baseline for 15m
- Sentry new issue spike: > 20 new events in 10m

## 10. SLOs (Initial Targets)

Service SLOs:
- API availability: 99.5% monthly
- WebSocket session stability: 99.0% successful reconnect within 10s
- Matchmaking speed: 90% of matches within 10s when compatible players exist
- Move submission latency: p95 < 500ms

Error budget:
- 0.5% monthly downtime budget for API

## 11. Instrumentation Requirements

Current state:
- Health endpoint exists.
- pino logging exists.
- Sentry exists.
- Redis and queue logic exists.

Add these metrics emitters in backend:
- `http_requests_total{route,method,status}`
- `http_request_duration_ms{route,method}`
- `ws_connections_active`
- `ws_events_total{event,success}`
- `ws_event_duration_ms{event}`
- `matchmaking_queue_depth{time_control_ms}`
- `matchmaking_wait_seconds_bucket`
- `matchmaking_matches_total{time_control_ms}`
- `matchmaking_failures_total{reason}`
- `game_active_total`
- `game_move_ack_ms`
- `redis_command_duration_ms{command}`
- `redis_cache_hit_ratio{entity=game}`
- `db_query_duration_ms{operation}`

Frontend telemetry additions:
- Socket disconnect/reconnect counters
- API call error rate by endpoint group
- Client render errors to Sentry with release tag

## 12. Operations Workflow

On alert:
1. Open Executive Health dashboard.
2. Identify failing layer (API/WS/Redis/DB/Frontend).
3. Correlate with logs and Sentry.
4. Apply runbook action.
5. Validate recovery on dashboard.
6. Record incident with timestamps and root cause.

Reference runbook:
- `docs/runbook/RUNBOOK.md`
- `docs/redis-management/OPERATIONS.md`

## 13. Rollout Plan

Week 1:
- Build Executive Health dashboard.
- Wire critical alerts only.
- Validate with synthetic failures in staging.

Week 2:
- Add Realtime Gameplay Ops dashboard.
- Add queue and websocket instrumentation.

Week 3:
- Add Infra and Errors dashboards.
- Tune thresholds based on real traffic baseline.

## 14. Acceptance Criteria

Dashboard rollout is complete when:
- All 4 dashboards are live and shared with on-call team.
- Critical alerts trigger and are tested in staging.
- Every alert maps to a documented runbook action.
- Weekly ops review uses these dashboards as source of truth.
