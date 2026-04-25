/**
 * useAiGame.ts
 *
 * Full game-loop hook for Play vs AI.
 * Manages board state, move selection, AI thinking, timer, and game result.
 *
 * All engine calls go through the WebView bridge (useMkaguzi).
 * Board rendering uses BoardState.fromFen() — pure TypeScript, no WASM needed.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { BoardState, PlayerColor } from "@tzdraft/mkaguzi-engine";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMkaguzi } from "../lib/game/mkaguzi-mobile";
import { getBestMove } from "../lib/game/ai-search";
import { markLevelCompletedLocally } from "../lib/game/bot-progression";
import type { RawMove, RawGameResult } from "../lib/game/bridge-types";
import {
  EndgameCountdown,
  evaluateEndgameCountdown,
  computeTimeoutResult,
} from "../lib/game/rules";

// ─── Initial FEN (app convention: WHITE at PDN 1-12, BLACK at PDN 21-32) ──────
const INITIAL_FEN =
  "W:W1,2,3,4,5,6,7,8,9,10,11,12:B21,22,23,24,25,26,27,28,29,30,31,32";

// ─── Persistence ──────────────────────────────────────────────────────────────
const GAME_SAVE_KEY = "tzdraft:ai-game-save";

type SavedAiGame = {
  botLevel: number;
  resolvedColor: "WHITE" | "BLACK";
  timeControlType: "none" | "total" | "per_move";
  timeSeconds: number;
  fen: string;
  fenHistory: string[];
  moveHistory: MoveRecord[];
  capturedBy: { WHITE: number; BLACK: number };
  currentPlayer: "WHITE" | "BLACK";
  moveCount: number;
  timeLeft: { WHITE: number; BLACK: number };
  undoUsed: boolean;
  hintUsed: boolean;
  reversibleMoveCount: number;
  thirtyMoveCount: number;
  endgameCountdown: EndgameCountdown | null;
  result: GameResult | null;
};

/** Wipes the saved AI game from AsyncStorage (call on resign/abandon). */
export async function clearSavedAiGame(): Promise<void> {
  await AsyncStorage.removeItem(GAME_SAVE_KEY);
}

/** Returns info about an in-progress saved AI game, or null if none exists. */
export async function getSavedAiGameInfo(): Promise<{
  botLevel: number;
  resolvedColor: "WHITE" | "BLACK";
  timeControlType: "none" | "total" | "per_move";
  timeSeconds: number;
} | null> {
  try {
    const raw = await AsyncStorage.getItem(GAME_SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedAiGame;
    if (saved.result !== null && saved.result !== undefined) return null;
    return {
      botLevel: saved.botLevel,
      resolvedColor: saved.resolvedColor,
      timeControlType: saved.timeControlType,
      timeSeconds: saved.timeSeconds,
    };
  } catch {
    return null;
  }
}

// ─── Notation helper ──────────────────────────────────────────────────────────
function buildNotation(move: RawMove): string {
  if (move.captures.length > 0) {
    return [move.from, ...move.captures, move.to].join("×");
  }
  return `${move.from}-${move.to}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────
export type PlayerColorParam = "WHITE" | "BLACK" | "RANDOM";

/**
 * Time control configuration.
 * - "none"     : no timer
 * - "total"    : human has a fixed pool of seconds (AI has no clock)
 * - "per_move" : human must move within N seconds per turn (AI has no clock)
 */
export type TimeControl =
  | { type: "none" }
  | { type: "total";    seconds: number }
  | { type: "per_move"; seconds: number };

export interface GameResult {
  winner: "WHITE" | "BLACK" | "DRAW" | null;
  reason: string;
}

export interface MoveRecord {
  notation: string;
  player: "WHITE" | "BLACK";
  captureCount: number;
  from: number;
  to: number;
}

export interface LastMove {
  from: number;
  to: number;
}

export interface LastMove {
  from: number;
  to: number;
}

export interface AiGameState {
  fen: string;
  board: BoardState;
  currentPlayer: PlayerColor;
  playerColor: PlayerColor;
  legalMoves: RawMove[];
  selectedSquare: number | null;
  validDestinations: number[];
  capturablePieces: number[];
  lastMove: LastMove | null;
  /** Pieces captured FROM each color (i.e. capturedBy.WHITE = black pieces taken by white) */
  capturedBy: { WHITE: number; BLACK: number };
  moveHistory: MoveRecord[];
  result: GameResult | null;
  isAiThinking: boolean;
  /** Human player's remaining pool seconds (only meaningful when timeControl.type === "total") */
  timeLeft: { WHITE: number; BLACK: number };
  /** Seconds left on the current move countdown (only meaningful when timeControl.type === "per_move") */
  moveTimeLeft: number;
  moveCount: number;
  /** Fires when the human taps an invalid square — use this to trigger board shake */
  invalidMoveSignal: number;
  /** True if undo was used at least once — reported to backend on session complete */
  undoUsed: boolean;
  /** True if hint was used at least once — blocks level unlock */
  hintUsed: boolean;
  /**
   * Whether the board should be rendered flipped (rotated 180°).
   *
   * Mobile convention (opposite of web):
   *   The mobile GRID has PDN 1–12 (WHITE) at the BOTTOM rows by construction,
   *   so we only flip when the human plays BLACK — bringing BLACK to the bottom.
   *   Web flips for WHITE because its engine puts WHITE at the top by default.
   *   Both produce the same UX: the human's pieces always appear at the bottom.
   */
  flipBoard: boolean;
  /** Direct access to the FEN history for history scrubbing in the UI */
  fenHistory: string[];
  /** Art. 8 countdown state for lone king / three kings draws */
  endgameCountdown: EndgameCountdown | null;
}

// Endgame rule logic moved to src/lib/game/rules.ts

export interface AiGameActions {
  selectSquare: (pdn: number) => void;
  reset: () => void;
  undo: () => void;
  hint: () => Promise<void>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useAiGame(
  botLevel: number,
  playerColorParam: PlayerColorParam,
  timeControl: TimeControl,
): AiGameState & AiGameActions {
  const bridge = useMkaguzi();

  // ── Derived time-control constants ────────────────────────────────────────
  const isTotalMode = timeControl.type === "total";
  const isPerMove   = timeControl.type === "per_move";
  const totalSeconds = isTotalMode  ? (timeControl as { type: "total";    seconds: number }).seconds : 0;
  const moveSeconds  = isPerMove    ? (timeControl as { type: "per_move"; seconds: number }).seconds : 0;

  // ── Resolve player color once ────────────────────────────────────────────
  const resolvedColor = useRef<PlayerColor>(
    playerColorParam === "RANDOM"
      ? Math.random() < 0.5
        ? PlayerColor.WHITE
        : PlayerColor.BLACK
      : playerColorParam === "WHITE"
      ? PlayerColor.WHITE
      : PlayerColor.BLACK,
  ).current;

  // ── Reset counter — incrementing this re-triggers the init effect ────────
  const [resetCount, setResetCount] = useState(0);

  // ── Core state ────────────────────────────────────────────────────────────
  const [fen, setFen] = useState(INITIAL_FEN);
  const [board, setBoard] = useState(() => BoardState.fromFen(INITIAL_FEN));
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>(PlayerColor.WHITE);
  const [legalMoves, setLegalMoves] = useState<RawMove[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [validDestinations, setValidDestinations] = useState<number[]>([]);
  const [capturablePieces, setCapturablePieces] = useState<number[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [capturedBy, setCapturedBy] = useState({ WHITE: 0, BLACK: 0 });
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [invalidMoveSignal, setInvalidMoveSignal] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ WHITE: totalSeconds, BLACK: totalSeconds });
  const [moveTimeLeft, setMoveTimeLeft] = useState(moveSeconds);
  const [endgameCountdown, setEndgameCountdown] = useState<EndgameCountdown | null>(null);

  // ── Draw-rule counters ────────────────────────────────────────────────────
  const fenHistory = useRef<string[]>([INITIAL_FEN]);
  const reversibleMoveCount = useRef(0);
  const thirtyMoveCount = useRef(0);
  const endgameCountdownRef = useRef<EndgameCountdown | null>(null);
  const aiThinkingRef = useRef(false);
  const resultRef = useRef<GameResult | null>(null);
  const undoUsedRef = useRef(false);
  const hintUsedRef = useRef(false);
  // Incremented every time the game is restored from AsyncStorage.
  // AI getBestMove calls capture this at start; stale results are discarded.
  const restoreGenerationRef = useRef(0);

  // Sync ref to state
  useEffect(() => { endgameCountdownRef.current = endgameCountdown; }, [endgameCountdown]);

  // ── Persistence: save game state to AsyncStorage on every move ──────────────
  useEffect(() => {
    if (moveCount === 0 && !result) return; // nothing to save yet
    const color = resolvedColor === PlayerColor.WHITE ? "WHITE" : "BLACK";
    const cur = currentPlayer === PlayerColor.WHITE ? "WHITE" : "BLACK";
    const tcType = timeControl.type;
    const tcSec = timeControl.type === "none" ? 0 : (timeControl as { type: string; seconds: number }).seconds;
    const save: SavedAiGame = {
      botLevel,
      resolvedColor: color,
      timeControlType: tcType,
      timeSeconds: tcSec,
      fen,
      fenHistory: fenHistory.current,
      moveHistory,
      capturedBy,
      currentPlayer: cur,
      moveCount,
      timeLeft,
      undoUsed: undoUsedRef.current,
      hintUsed: hintUsedRef.current,
      reversibleMoveCount: reversibleMoveCount.current,
      thirtyMoveCount: thirtyMoveCount.current,
      endgameCountdown,
      result,
    };
    AsyncStorage.setItem(GAME_SAVE_KEY, JSON.stringify(save)).catch(() => {});
  }, [fen, moveHistory, capturedBy, currentPlayer, moveCount, timeLeft, endgameCountdown, result]);
  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Total-time timer (human only — AI has no clock) ───────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (player: PlayerColor) => {
      if (!isTotalMode) return;
      if (player !== resolvedColor) return; // AI has no clock
      stopTimer();
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (resultRef.current) { stopTimer(); return prev; }
          const remaining = prev[player] - 1;
          if (remaining <= 0) {
            const winner = computeTimeoutResult(
              board,
              player,
              endgameCountdownRef.current,
            );
            const r: GameResult = { winner, reason: winner === "DRAW" ? "timeout-draw" : "time" };
            setResult(r);
            resultRef.current = r;
            return { ...prev, [player]: 0 };
          }
          return { ...prev, [player]: remaining };
        });
      }, 1000);
    },
    [isTotalMode, resolvedColor, stopTimer],
  );

  // ── Per-move countdown timer (human only) ────────────────────────────────
  const moveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopMoveTimer = useCallback(() => {
    if (moveTimerRef.current != null) {
      clearInterval(moveTimerRef.current);
      moveTimerRef.current = null;
    }
  }, []);

  const startMoveTimer = useCallback(() => {
    if (!isPerMove) return;
    stopMoveTimer();
    setMoveTimeLeft(moveSeconds); // reset to full budget
    moveTimerRef.current = setInterval(() => {
      setMoveTimeLeft((prev) => {
        if (resultRef.current) { stopMoveTimer(); return prev; }
        if (prev <= 1) {
          stopMoveTimer();
          const winner = computeTimeoutResult(
            board,
            resolvedColor,
            endgameCountdownRef.current,
          );
          const r: GameResult = { winner, reason: winner === "DRAW" ? "timeout-draw" : "time" };
          setResult(r);
          resultRef.current = r;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isPerMove, moveSeconds, resolvedColor, stopMoveTimer]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const computeCapturables = useCallback((moves: RawMove[]): number[] => {
    const caps = new Set<number>();
    for (const m of moves) for (const c of m.captures) caps.add(c);
    return Array.from(caps);
  }, []);

  const checkResult = useCallback(
    async (newFen: string): Promise<GameResult | null> => {
      // For threefold repetition (Art. 8.2)
      const occurrences = fenHistory.current.filter((f) => f === newFen).length;
      if (occurrences >= 3) return { winner: "DRAW", reason: "repetition" };

      // Art. 8 rules handled by evaluating counters in submitMove.
      // We pass 0s to the engine-bridge result check because we handle those
      // Articles (8.3, 8.4, 8.5) explicitly in the hook for better control.
      const raw: RawGameResult = await bridge.gameResult(newFen, 0, 0, 0);

      if (raw.status === "ongoing") return null;
      if (raw.status === "win") {
        const winner =
          raw.winner === "white" ? "BLACK" : raw.winner === "black" ? "WHITE" : "DRAW";
        return { winner, reason: raw.reason ?? "checkmate" };
      }
      return { winner: "DRAW", reason: raw.reason ?? "draw" };
    },
    [bridge],
  );

  // Endgame rule logic moved to src/lib/game/rules.ts

  // ── Apply a move (human or AI) ────────────────────────────────────────────
  const submitMove = useCallback(
    async (move: RawMove, currentFen: string, player: PlayerColor) => {
      if (resultRef.current) return;

      const newFen = await bridge.applyMove(currentFen, move.from, move.to);
      if (!newFen) return;

      const newBoard = BoardState.fromFen(newFen);

      // Draw rules (Art. 8)
      if (move.captures.length > 0 || move.promote) {
        reversibleMoveCount.current = 0;
      } else {
        reversibleMoveCount.current += 1;
      }
      const { reason: drawReason, nextCountdown, nextThirtyCount } = evaluateEndgameCountdown(
        newBoard,
        player,
        move.captures.length > 0,
        endgameCountdownRef.current,
        thirtyMoveCount.current,
      );
      thirtyMoveCount.current = nextThirtyCount;
      setEndgameCountdown(nextCountdown);
      fenHistory.current.push(newFen);

      // Update last-move, captures, and history
      const playerKey = player === PlayerColor.WHITE ? "WHITE" : "BLACK";
      setLastMove({ from: move.from, to: move.to });
      if (move.captures.length > 0) {
        setCapturedBy((prev) => ({
          ...prev,
          [playerKey]: prev[playerKey] + move.captures.length,
        }));
      }
      setMoveHistory((prev) => [
        ...prev,
        {
          notation: buildNotation(move),
          player: playerKey,
          captureCount: move.captures.length,
          from: move.from,
          to: move.to,
        },
      ]);

      const nextPlayer =
        player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;

      // Check result
      const gameResult =
        (drawReason ? { winner: "DRAW", reason: drawReason } as GameResult : null) ||
        (await checkResult(newFen));
      if (gameResult) {
        stopTimer();
        stopMoveTimer();
        setFen(newFen);
        setBoard(newBoard);
        setLegalMoves([]);
        setSelectedSquare(null);
        setValidDestinations([]);
        setCapturablePieces([]);
        setResult(gameResult);
        resultRef.current = gameResult;

        if (
          gameResult.winner !== "DRAW" &&
          gameResult.winner !== null &&
          !undoUsedRef.current &&
          !hintUsedRef.current &&
          ((gameResult.winner === "WHITE" && resolvedColor === PlayerColor.WHITE) ||
            (gameResult.winner === "BLACK" && resolvedColor === PlayerColor.BLACK))
        ) {
          markLevelCompletedLocally(botLevel).catch(() => {});
        }
        return;
      }

      const nextMoves = await bridge.generateMoves(newFen);
      setFen(newFen);
      setBoard(newBoard);
      setCurrentPlayer(nextPlayer);
      setLegalMoves(nextMoves);
      setSelectedSquare(null);
      setValidDestinations([]);
      setCapturablePieces(computeCapturables(nextMoves));
      setMoveCount((c) => c + 1);

      // Total timer: only runs on human's turn
      startTimer(nextPlayer);

      // Per-move timer: start on human's turn, stop + reset on AI's turn
      if (isPerMove) {
        if (nextPlayer === resolvedColor) {
          startMoveTimer();
        } else {
          stopMoveTimer();
          setMoveTimeLeft(moveSeconds); // reset display while AI thinks
        }
      }

      if (nextMoves.length === 0) {
        stopTimer();
        stopMoveTimer();
        const stalemateWinner = nextPlayer === PlayerColor.WHITE ? "BLACK" : "WHITE";
        const r: GameResult = { winner: stalemateWinner, reason: "stalemate" };
        setResult(r);
        resultRef.current = r;
        return;
      }

      if (nextPlayer !== resolvedColor) {
        const capturedGeneration = restoreGenerationRef.current;
        aiThinkingRef.current = true;
        setIsAiThinking(true);
        try {
          const best = await getBestMove(newFen, botLevel, fenHistory.current, bridge);
          if (best && !resultRef.current && restoreGenerationRef.current === capturedGeneration) {
            await submitMove(best, newFen, nextPlayer);
          }
        } finally {
          aiThinkingRef.current = false;
          setIsAiThinking(false);
        }
      }
    },
    [
      bridge, botLevel, checkResult, computeCapturables, resolvedColor,
      startTimer, stopTimer, isPerMove, moveSeconds, startMoveTimer, stopMoveTimer,
    ],
  );

  // ── Init once bridge is ready ─────────────────────────────────────────────
  useEffect(() => {
    if (!bridge.isReady) return;
    let cancelled = false;
    (async () => {
      // If a valid saved game exists for this session, let the load effect handle init.
      try {
        const raw = await AsyncStorage.getItem(GAME_SAVE_KEY);
        if (raw && !cancelled) {
          const saved = JSON.parse(raw) as SavedAiGame;
          const color = resolvedColor === PlayerColor.WHITE ? "WHITE" : "BLACK";
          if (
            saved.botLevel === botLevel &&
            saved.resolvedColor === color &&
            saved.result === null
          ) {
            return; // load effect handles restore + AI trigger
          }
        }
      } catch {}

      const moves = await bridge.generateMoves(INITIAL_FEN);
      if (cancelled) return;
      setLegalMoves(moves);
      setCapturablePieces(computeCapturables(moves));

      if (resolvedColor === PlayerColor.WHITE) {
        // Human goes first
        startTimer(PlayerColor.WHITE);
        if (isPerMove) startMoveTimer();
      } else {
        // AI goes first — no timer needed until AI finishes its first move
        const capturedGeneration = restoreGenerationRef.current;
        aiThinkingRef.current = true;
        setIsAiThinking(true);
        try {
          const best = await getBestMove(INITIAL_FEN, botLevel, fenHistory.current, bridge);
          if (best && !cancelled && restoreGenerationRef.current === capturedGeneration) {
            await submitMove(best, INITIAL_FEN, PlayerColor.WHITE);
          }
        } finally {
          aiThinkingRef.current = false;
          setIsAiThinking(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [bridge.isReady, resetCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stopTimer(); stopMoveTimer(); }, [stopTimer, stopMoveTimer]);

  // ── selectSquare ──────────────────────────────────────────────────────────
  const selectSquare = useCallback(
    (pdn: number) => {
      if (result || isAiThinking || currentPlayer !== resolvedColor) return;

      const board_ = BoardState.fromFen(fen);
      const piece = board_.getPieceAt({ value: pdn } as never);
      const ownPieceMoves = legalMoves.filter((m) => m.from === pdn);

      if (piece && piece.color === currentPlayer && ownPieceMoves.length > 0) {
        setSelectedSquare(pdn);
        setValidDestinations(ownPieceMoves.map((m) => m.to));
        return;
      }

      if (selectedSquare != null && validDestinations.includes(pdn)) {
        const move = legalMoves.find(
          (m) => m.from === selectedSquare && m.to === pdn,
        );
        if (move) {
          setSelectedSquare(null);
          setValidDestinations([]);
          submitMove(move, fen, currentPlayer).catch(console.error);
          return;
        }
      }

      // Invalid tap — fire shake signal
      if (piece || selectedSquare != null) {
        setInvalidMoveSignal((n) => n + 1);
      }
      setSelectedSquare(null);
      setValidDestinations([]);
    },
    [
      result, isAiThinking, currentPlayer, resolvedColor, fen,
      legalMoves, selectedSquare, validDestinations, submitMove,
    ],
  );

  // ── hint ──────────────────────────────────────────────────────────────────
  const hint = useCallback(async () => {
    if (result || isAiThinking || currentPlayer !== resolvedColor) return;

    hintUsedRef.current = true;
    setIsAiThinking(true);
    aiThinkingRef.current = true;
    try {
      const best = await getBestMove(fen, Math.min(botLevel + 2, 10), fenHistory.current, bridge);
      if (best) {
        setSelectedSquare(best.from);
        setValidDestinations([best.to]);
      }
    } finally {
      aiThinkingRef.current = false;
      setIsAiThinking(false);
    }
  }, [result, isAiThinking, currentPlayer, resolvedColor, fen, bridge, botLevel]);

  // ── undo ──────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (aiThinkingRef.current || result) return;

    setMoveHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;

      // Pop 2 moves if the last one was AI's, else 1 (if the last was human's)
      const lastMove_ = prevHistory[prevHistory.length - 1];
      const isLastAiMove = lastMove_.player !== (resolvedColor === PlayerColor.WHITE ? "WHITE" : "BLACK");
      const movesToPop = isLastAiMove && prevHistory.length >= 2 ? 2 : 1;
      const newHistory = prevHistory.slice(0, prevHistory.length - movesToPop);

      // Restore FEN from fenHistory
      const targetFenIdx = fenHistory.current.length - 1 - movesToPop;
      const restoredFen = fenHistory.current[Math.max(0, targetFenIdx)] ?? INITIAL_FEN;
      fenHistory.current = fenHistory.current.slice(0, Math.max(1, fenHistory.current.length - movesToPop));

      // Recompute capturedBy from remaining history
      const newCapturedBy = { WHITE: 0, BLACK: 0 };
      for (const m of newHistory) {
        newCapturedBy[m.player] += m.captureCount;
      }

      // Restore board + state
      const restoredBoard = BoardState.fromFen(restoredFen);
      const prevPlayer = newHistory.length % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;

      // Recompute Art. 8 counters from restored state
      const wp = restoredBoard.getPiecesByColor(PlayerColor.WHITE);
      const bp = restoredBoard.getPiecesByColor(PlayerColor.BLACK);
      const wk = wp.filter((p) => p.isKing()).length;
      const bk = bp.filter((p) => p.isKing()).length;
      const wm = wp.length - wk;
      const bm = bp.length - bk;

      // Reset counters — recomputing accurately on every move is better, but here we reset
      // to let evaluateEndgameCountdown re-detect the scenario on the next move.
      thirtyMoveCount.current = 0;
      setEndgameCountdown(null);

      stopTimer();
      stopMoveTimer();
      setFen(restoredFen);
      setBoard(restoredBoard);
      setCurrentPlayer(prevPlayer);
      setResult(null);
      resultRef.current = null;
      setSelectedSquare(null);
      setValidDestinations([]);
      setCapturablePieces([]);
      setCapturedBy(newCapturedBy);
      setLastMove(null);
      setMoveCount((c) => Math.max(0, c - movesToPop));

      undoUsedRef.current = true;

      // Async: reload legal moves + restart timer
      bridge.generateMoves(restoredFen).then((moves) => {
        setLegalMoves(moves);
        setCapturablePieces(computeCapturables(moves));
        startTimer(prevPlayer);
        if (isPerMove && prevPlayer === resolvedColor) startMoveTimer();
        else if (isPerMove) setMoveTimeLeft(moveSeconds);
      }).catch(() => {});

      return newHistory;
    });
  }, [result, resolvedColor, bridge, computeCapturables, stopTimer, stopMoveTimer, startTimer, isPerMove, startMoveTimer, moveSeconds]);

  // ── Persistence: load saved game state on mount (once bridge is ready) ───────
  useEffect(() => {
    if (!bridge.isReady) return;
    AsyncStorage.getItem(GAME_SAVE_KEY).then(async (raw) => {
      if (!raw) return;
      let saved: SavedAiGame;
      try { saved = JSON.parse(raw) as SavedAiGame; } catch { return; }
      const color = resolvedColor === PlayerColor.WHITE ? "WHITE" : "BLACK";
      if (saved.botLevel !== botLevel || saved.resolvedColor !== color || saved.result !== null) return;

      fenHistory.current = saved.fenHistory;
      reversibleMoveCount.current = saved.reversibleMoveCount;
      thirtyMoveCount.current = saved.thirtyMoveCount;
      endgameCountdownRef.current = saved.endgameCountdown;
      undoUsedRef.current = saved.undoUsed;
      hintUsedRef.current = saved.hintUsed;

      const savedCurrentPlayer = saved.currentPlayer === "WHITE" ? PlayerColor.WHITE : PlayerColor.BLACK;

      setFen(saved.fen);
      setBoard(BoardState.fromFen(saved.fen));
      setCurrentPlayer(savedCurrentPlayer);
      setMoveHistory(saved.moveHistory);
      setCapturedBy(saved.capturedBy);
      setMoveCount(saved.moveCount);
      setTimeLeft(saved.timeLeft);
      setEndgameCountdown(saved.endgameCountdown);

      // Any in-flight AI promise from a previous session is now stale.
      restoreGenerationRef.current += 1;
      const capturedGeneration = restoreGenerationRef.current;

      try {
        const moves = await bridge.generateMoves(saved.fen);
        setLegalMoves(moves);
        setCapturablePieces(computeCapturables(moves));

        if (savedCurrentPlayer !== resolvedColor && !resultRef.current) {
          // It's the AI's turn — start thinking immediately on resume.
          aiThinkingRef.current = true;
          setIsAiThinking(true);
          try {
            const best = await getBestMove(saved.fen, botLevel, fenHistory.current, bridge);
            if (best && !resultRef.current && restoreGenerationRef.current === capturedGeneration) {
              await submitMove(best, saved.fen, savedCurrentPlayer);
            }
          } finally {
            aiThinkingRef.current = false;
            setIsAiThinking(false);
          }
        } else if (savedCurrentPlayer === resolvedColor) {
          // It's the human's turn — restart timers.
          startTimer(savedCurrentPlayer);
          if (isPerMove) startMoveTimer();
        }
      } catch {}
    }).catch(() => {});
  }, [bridge.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopTimer();
    stopMoveTimer();
    setFen(INITIAL_FEN);
    setBoard(BoardState.fromFen(INITIAL_FEN));
    setCurrentPlayer(PlayerColor.WHITE);
    setLegalMoves([]);
    setSelectedSquare(null);
    setValidDestinations([]);
    setCapturablePieces([]);
    setLastMove(null);
    setCapturedBy({ WHITE: 0, BLACK: 0 });
    setMoveHistory([]);
    setResult(null);
    resultRef.current = null;
    setIsAiThinking(false);
    aiThinkingRef.current = false;
    setMoveCount(0);
    setInvalidMoveSignal(0);
    undoUsedRef.current = false;
    hintUsedRef.current = false;
    fenHistory.current = [INITIAL_FEN];
    AsyncStorage.removeItem(GAME_SAVE_KEY).catch(() => {});
    reversibleMoveCount.current = 0;
    thirtyMoveCount.current = 0;
    setEndgameCountdown(null);
    setTimeLeft({ WHITE: totalSeconds, BLACK: totalSeconds });
    setMoveTimeLeft(moveSeconds);
    // Increment last — triggers the init effect after all state is wiped
    setResetCount((n) => n + 1);
  }, [stopTimer, stopMoveTimer, totalSeconds, moveSeconds]);

  return {
    fen,
    board,
    currentPlayer,
    playerColor: resolvedColor,
    legalMoves,
    selectedSquare,
    validDestinations,
    capturablePieces,
    lastMove,
    capturedBy,
    moveHistory,
    result,
    isAiThinking,
    timeLeft,
    moveTimeLeft,
    moveCount,
    invalidMoveSignal,
    undoUsed: undoUsedRef.current,
    hintUsed: hintUsedRef.current,
    flipBoard: resolvedColor === PlayerColor.BLACK,
    fenHistory: fenHistory.current,
    endgameCountdown,
    selectSquare,
    hint,
    reset,
    undo,
  };
}
