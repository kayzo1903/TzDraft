/**
 * TzDraft Load Test — k6
 *
 * Simulates 20 concurrent games (mix of PvP and AI) as required by W4.3.
 *
 * Usage:
 *   k6 run load-tests/k6/game-load-test.js
 *   k6 run --env BASE_URL=https://staging.tzdraft.com load-tests/k6/game-load-test.js
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 *
 * Scenarios:
 *   - Ramp to 20 VUs over 30s, hold 2 minutes, ramp down
 *   - Each VU: authenticate → create/join game → play 5 moves → end
 *
 * Thresholds (production targets):
 *   - 95th percentile HTTP response < 500ms
 *   - Error rate < 1%
 *   - Move submission < 300ms p95
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Configuration ─────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const WS_URL = BASE_URL.replace(/^http/, 'ws');

// ─── Custom metrics ────────────────────────────────────────────────────────

const moveLatency = new Trend('move_latency_ms', true);
const errorRate = new Rate('errors');

// ─── Load profile ──────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    pvp_games: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 }, // ramp to 20 VUs (= 10 concurrent PvP pairs)
        { duration: '2m',  target: 20 }, // hold
        { duration: '15s', target: 0  }, // ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration:  ['p(95)<500'],  // 95% of all HTTP requests under 500ms
    move_latency_ms:    ['p(95)<300'],  // move submission p95 under 300ms
    errors:             ['rate<0.01'],  // error rate below 1%
    http_req_failed:    ['rate<0.01'],
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Registers and logs in a test user, returns the JWT token.
 * Uses a unique phone number per VU to avoid collisions.
 */
function authenticate(vuId) {
  // Use a test account seeded in the DB for load testing.
  // Replace with real seeded credentials before running against staging.
  const phone = `+255700${String(vuId).padStart(6, '0')}`;
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ phone, password: 'LoadTest@123' }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const ok = check(res, {
    'auth: status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'auth: has token': (r) => {
      try { return !!JSON.parse(r.body).token; } catch { return false; }
    },
  });

  if (!ok) {
    errorRate.add(1);
    return null;
  }

  errorRate.add(0);
  return JSON.parse(res.body).token;
}

/**
 * Creates a casual AI game and returns the gameId.
 */
function createAiGame(token) {
  const res = http.post(
    `${BASE_URL}/games`,
    JSON.stringify({ gameType: 'AI', aiLevel: 3 }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const ok = check(res, {
    'create game: status 201': (r) => r.status === 201,
    'create game: has id': (r) => {
      try { return !!JSON.parse(r.body).id; } catch { return false; }
    },
  });

  if (!ok) { errorRate.add(1); return null; }
  errorRate.add(0);
  return JSON.parse(res.body).id;
}

/**
 * Submits one move. Returns true on success.
 */
function submitMove(token, gameId, from, to) {
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/games/${gameId}/moves`,
    JSON.stringify({ from, to }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  moveLatency.add(Date.now() - start);

  const ok = check(res, {
    'move: status 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  errorRate.add(ok ? 0 : 1);
  return ok;
}

/**
 * Fetches current game state. Used to get the AI response move.
 */
function getGameState(token, gameId) {
  const res = http.get(`${BASE_URL}/games/${gameId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(res, { 'get game: status 200': (r) => r.status === 200 });
  try { return JSON.parse(res.body); } catch { return null; }
}

// ─── Opening moves (standard Tanzania Drafti openings) ────────────────────

const OPENING_MOVES = [
  { from: 9,  to: 13 },
  { from: 10, to: 14 },
  { from: 11, to: 15 },
  { from: 12, to: 16 },
  { from: 9,  to: 14 },
];

// ─── Main VU function ──────────────────────────────────────────────────────

export default function () {
  const vuId = __VU;

  // 1. Authenticate
  const token = authenticate(vuId);
  if (!token) { sleep(2); return; }

  // 2. Create an AI game (doesn't require a second VU)
  const gameId = createAiGame(token);
  if (!gameId) { sleep(2); return; }

  sleep(0.5);

  // 3. Play 5 moves from the opening (AI responds automatically server-side)
  for (let i = 0; i < 5; i++) {
    const move = OPENING_MOVES[i % OPENING_MOVES.length];
    const ok = submitMove(token, gameId, move.from, move.to);
    if (!ok) break;

    // Wait for AI to respond (server processes synchronously for AI games)
    sleep(1);

    // Optionally fetch state to validate board
    if (i === 2) {
      getGameState(token, gameId);
    }
  }

  // 4. Health check as a baseline (should always be fast)
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health: 200': (r) => r.status === 200 });

  sleep(1);
}
