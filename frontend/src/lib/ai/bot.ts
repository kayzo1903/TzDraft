/**
 * bot.ts — AI move selection via Mkaguzi WASM search.
 *
 * The heavy search runs in a dedicated Web Worker so the UI thread stays
 * responsive.  The worker is created lazily on first call and reused.
 *
 * getBestMove() is now async; callers in useLocalGame should await it.
 */

import { BoardState, Move, PlayerColor, Position, MkaguziEngine } from "@tzdraft/mkaguzi-engine";
import type { RawSearchResult } from "@tzdraft/mkaguzi-engine";

// ─── Worker management ────────────────────────────────────────────────────

let _worker: Worker | null = null;
let _workerReady = false;
const _pendingCallbacks = new Map<
  string,
  { resolve: (m: Move | null) => void; reject: (e: Error) => void }
>();

function getOrCreateWorker(): Worker {
  if (_worker) return _worker;

  _worker = new Worker("/wasm/search-worker.js", { type: "module" });

  _worker.onmessage = (event: MessageEvent) => {
    const msg = event.data as Record<string, unknown>;

    if (msg.type === "ready") {
      _workerReady = true;
      return;
    }

    if (msg.type === "result") {
      const id = msg.id as string;
      const cb = _pendingCallbacks.get(id);
      if (!cb) return;
      _pendingCallbacks.delete(id);

      const raw = msg.move as RawSearchResult | null;
      if (!raw) {
        cb.resolve(null);
        return;
      }

      const from = new Position(raw.from);
      const to = new Position(raw.to);
      const capturedSquares = raw.captures.map((n: number) => new Position(n));
      const notation = Move.generateNotation(from, to, capturedSquares);
      const move = new Move(
        `${raw.from}-${raw.to}`,
        "local",
        0,
        PlayerColor.WHITE, // placeholder — caller knows the real player
        from,
        to,
        capturedSquares,
        raw.promote,
        notation,
      );
      cb.resolve(move);
      return;
    }

    if (msg.type === "error") {
      const id = msg.id as string;
      const cb = _pendingCallbacks.get(id);
      if (cb) {
        _pendingCallbacks.delete(id);
        cb.reject(new Error(msg.message as string));
      }
    }
  };

  _worker.onerror = (err) => {
    console.error("[bot] worker error", err);
    _workerReady = false;
    _worker = null;
  };

  // Initialise the worker (loads WASM)
  _worker.postMessage({ type: "init", wasmJsUrl: "/wasm/mkaguzi_wasm.js" });
  return _worker;
}

// ─── Level → search params ────────────────────────────────────────────────

const LEVEL_PARAMS: Record<
  number,
  { timeMs: number; depth: number; level: number; randomness: number; blunderChance: number }
> = {
  1:  { timeMs: 150,   depth: 0, level: 15, randomness: 250, blunderChance: 0.70 }, // 70% random
  2:  { timeMs: 200,   depth: 0, level: 15, randomness: 125, blunderChance: 0.40 }, // 40% random
  3:  { timeMs: 350,   depth: 0, level: 15, randomness: 75,  blunderChance: 0.15 }, // 15% random
  4:  { timeMs: 500,   depth: 0, level: 16, randomness: 40,  blunderChance: 0.05 }, // 5% random
  5:  { timeMs: 750,   depth: 0, level: 16, randomness: 25,  blunderChance: 0    },
  6:  { timeMs: 1000,  depth: 0, level: 16, randomness: 15,  blunderChance: 0    },
  7:  { timeMs: 1500,  depth: 0, level: 17, randomness: 8,   blunderChance: 0    },
  8:  { timeMs: 2000,  depth: 0, level: 17, randomness: 4,   blunderChance: 0    },
  9:  { timeMs: 2500,  depth: 0, level: 18, randomness: 2,   blunderChance: 0    },
  10: { timeMs: 3000,  depth: 0, level: 18, randomness: 1,   blunderChance: 0    },
  11: { timeMs: 3500,  depth: 0, level: 18, randomness: 0,   blunderChance: 0    },
  12: { timeMs: 4000,  depth: 0, level: 19, randomness: 0,   blunderChance: 0    },
  13: { timeMs: 4500,  depth: 0, level: 19, randomness: 0,   blunderChance: 0    },
  14: { timeMs: 5000,  depth: 0, level: 19, randomness: 0,   blunderChance: 0    },
  15: { timeMs: 5500,  depth: 0, level: 19, randomness: 0,   blunderChance: 0    },
  16: { timeMs: 6000,  depth: 0, level: 19, randomness: 0,   blunderChance: 0    },
  17: { timeMs: 7000,  depth: 0, level: 19, randomness: 0,   blunderChance: 0    },
  18: { timeMs: 8000,  depth: 0, level: 19, randomness: 0,   blunderChance: 0    },
  19: { timeMs: 9000,  depth: 0, level: 19, randomness: 0,   blunderChance: 0    },
};

function getParams(level: number) {
  return LEVEL_PARAMS[Math.max(1, Math.min(level, 19))] ?? LEVEL_PARAMS[19];
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Asynchronously compute the best move using the Mkaguzi WASM engine.
 *
 * @param board       Current board state
 * @param player      Side to move
 * @param level       AI difficulty level 1-19
 * @param fenHistory  Prior app-convention FEN strings for repetition detection
 */
export async function getBestMove(
  board: BoardState,
  player: PlayerColor,
  level: number,
  fenHistory: string[] = [],
): Promise<Move | null> {
  const params = getParams(level);

  // ─── Human Blunder Logic ────────────────────────────────────────────────
  // If a blunder is triggered, we pick a completely random legal move
  // instead of asking the engine. This ensures beginners can win.
  if (params.blunderChance > 0 && Math.random() < params.blunderChance) {
    const legalMoves = MkaguziEngine.generateLegalMoves(board, player);
    if (legalMoves.length > 0) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
  }

  const worker = getOrCreateWorker();

  // If the worker isn't ready yet, wait briefly then try inline WASM
  if (!_workerReady) {
    await new Promise<void>((res) => setTimeout(res, 50));
    if (!_workerReady) {
      // Try synchronous fallback if WASM is loaded on main thread
      try {
        const { wasmSearch, isEngineReady } = await import("@tzdraft/mkaguzi-engine");
        if (isEngineReady()) {
          const fen = board.toFen(player);
          const raw = wasmSearch(fen, fenHistory, params.timeMs, params.depth, params.level, params.randomness);
          if (!raw) return null;
          const from = new Position(raw.from);
          const to = new Position(raw.to);
          const caps = raw.captures.map((n) => new Position(n));
          return new Move(`${raw.from}-${raw.to}`, "local", 0, player, from, to, caps, raw.promote, Move.generateNotation(from, to, caps));
        }
      } catch {}
      return null;
    }
  }

  const id = `${Date.now()}-${Math.random()}`;
  const fen = board.toFen(player);

  return new Promise<Move | null>((resolve, reject) => {
    _pendingCallbacks.set(id, { resolve, reject });
    worker.postMessage({
      type: "search",
      id,
      fen,
      history: fenHistory,
      timeMs: params.timeMs,
      depth: params.depth,
      level: params.level,
      randomness: params.randomness,
    });

    // Timeout safety net
    setTimeout(() => {
      if (_pendingCallbacks.has(id)) {
        _pendingCallbacks.delete(id);
        resolve(null);
      }
    }, params.timeMs + 5000);
  }).then((move) => {
    // Fix the player field (worker returns placeholder WHITE)
    if (!move) return null;
    return new Move(
      move.id,
      move.gameId,
      move.moveNumber,
      player,
      move.from,
      move.to,
      move.capturedSquares,
      move.isPromotion,
      move.notation,
      move.createdAt,
    );
  });
}
