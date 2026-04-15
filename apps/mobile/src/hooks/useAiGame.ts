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
import { useMkaguzi } from "../lib/game/mkaguzi-mobile";
import { getBestMove } from "../lib/game/ai-search";
import { markLevelCompleted } from "../lib/game/bot-progression";
import type { RawMove, RawGameResult } from "../lib/game/bridge-types";

// ─── Initial FEN (app convention: WHITE at PDN 1-12, BLACK at PDN 21-32) ──────
const INITIAL_FEN =
  "W:W1,2,3,4,5,6,7,8,9,10,11,12:B21,22,23,24,25,26,27,28,29,30,31,32";

// ─── Notation helper ──────────────────────────────────────────────────────────
function buildNotation(move: RawMove): string {
  if (move.captures.length > 0) {
    return [move.from, ...move.captures, move.to].join("×");
  }
  return `${move.from}-${move.to}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────
export type PlayerColorParam = "WHITE" | "BLACK" | "RANDOM";

export interface GameResult {
  winner: "WHITE" | "BLACK" | "DRAW" | null;
  reason: string;
}

export interface MoveRecord {
  notation: string;
  player: "WHITE" | "BLACK";
  captureCount: number;
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
  timeLeft: { WHITE: number; BLACK: number };
  moveCount: number;
  /** Fires when the human taps an invalid square — use this to trigger board shake */
  invalidMoveSignal: number;
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
}

export interface AiGameActions {
  selectSquare: (pdn: number) => void;
  resign: () => void;
  reset: () => void;
  undo: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useAiGame(
  botLevel: number,
  playerColorParam: PlayerColorParam,
  timeSeconds: number,
): AiGameState & AiGameActions {
  const bridge = useMkaguzi();

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
  const [timeLeft, setTimeLeft] = useState({
    WHITE: timeSeconds,
    BLACK: timeSeconds,
  });

  // ── Draw-rule counters ────────────────────────────────────────────────────
  const fenHistory = useRef<string[]>([INITIAL_FEN]);
  const reversibleMoveCount = useRef(0);
  const threeKingsCount = useRef(0);
  const endgameCount = useRef(0);
  const aiThinkingRef = useRef(false);
  const resultRef = useRef<GameResult | null>(null);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (player: PlayerColor) => {
      if (timeSeconds <= 0) return;
      stopTimer();
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const remaining = prev[player] - 1;
          if (remaining <= 0) {
            stopTimer();
            const winner = player === PlayerColor.WHITE ? "BLACK" : "WHITE";
            const r: GameResult = { winner, reason: "time" };
            setResult(r);
            resultRef.current = r;
            return { ...prev, [player]: 0 };
          }
          return { ...prev, [player]: remaining };
        });
      }, 1000);
    },
    [timeSeconds, stopTimer],
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const computeCapturables = useCallback((moves: RawMove[]): number[] => {
    const caps = new Set<number>();
    for (const m of moves) for (const c of m.captures) caps.add(c);
    return Array.from(caps);
  }, []);

  const checkResult = useCallback(
    async (newFen: string): Promise<GameResult | null> => {
      const raw: RawGameResult = await bridge.gameResult(
        newFen,
        reversibleMoveCount.current,
        threeKingsCount.current,
        endgameCount.current,
      );
      if (raw.status === "ongoing") return null;
      if (raw.status === "win") {
        // NOTE: appFenToMkaguziFen in the WASM bridge swaps WHITE↔BLACK squares
        // before calling the engine. So the engine's "white" winner is actually
        // the app's BLACK player and "black" winner is the app's WHITE player.
        const winner =
          raw.winner === "white" ? "BLACK" : raw.winner === "black" ? "WHITE" : "DRAW";
        return { winner, reason: raw.reason ?? "checkmate" };
      }
      return { winner: "DRAW", reason: raw.reason ?? "draw" };
    },
    [bridge],
  );

  // ── Apply a move (human or AI) ────────────────────────────────────────────
  const submitMove = useCallback(
    async (move: RawMove, currentFen: string, player: PlayerColor) => {
      if (resultRef.current) return;

      const newFen = await bridge.applyMove(currentFen, move.from, move.to);
      if (!newFen) return;

      // Draw counters
      if (move.captures.length > 0 || move.promote) {
        reversibleMoveCount.current = 0;
      } else {
        reversibleMoveCount.current += 1;
      }
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
        { notation: buildNotation(move), player: playerKey, captureCount: move.captures.length },
      ]);

      const newBoard = BoardState.fromFen(newFen);
      const nextPlayer =
        player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;

      // Check result
      const gameResult = await checkResult(newFen);
      if (gameResult) {
        stopTimer();
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
          ((gameResult.winner === "WHITE" && resolvedColor === PlayerColor.WHITE) ||
            (gameResult.winner === "BLACK" && resolvedColor === PlayerColor.BLACK))
        ) {
          markLevelCompleted(botLevel).catch(() => {});
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
      startTimer(nextPlayer);

      if (nextMoves.length === 0) {
        stopTimer();
        const stalemateWinner = nextPlayer === PlayerColor.WHITE ? "BLACK" : "WHITE";
        const r: GameResult = { winner: stalemateWinner, reason: "stalemate" };
        setResult(r);
        resultRef.current = r;
        return;
      }

      if (nextPlayer !== resolvedColor) {
        aiThinkingRef.current = true;
        setIsAiThinking(true);
        try {
          const best = await getBestMove(newFen, botLevel, fenHistory.current, bridge);
          if (best && !resultRef.current) {
            await submitMove(best, newFen, nextPlayer);
          }
        } finally {
          aiThinkingRef.current = false;
          setIsAiThinking(false);
        }
      }
    },
    [bridge, botLevel, checkResult, computeCapturables, resolvedColor, startTimer, stopTimer],
  );

  // ── Init once bridge is ready ─────────────────────────────────────────────
  useEffect(() => {
    if (!bridge.isReady) return;
    let cancelled = false;
    (async () => {
      const moves = await bridge.generateMoves(INITIAL_FEN);
      if (cancelled) return;
      setLegalMoves(moves);
      setCapturablePieces(computeCapturables(moves));
      startTimer(PlayerColor.WHITE);
      if (resolvedColor === PlayerColor.BLACK) {
        aiThinkingRef.current = true;
        setIsAiThinking(true);
        try {
          const best = await getBestMove(INITIAL_FEN, botLevel, fenHistory.current, bridge);
          if (best && !cancelled) await submitMove(best, INITIAL_FEN, PlayerColor.WHITE);
        } finally {
          aiThinkingRef.current = false;
          setIsAiThinking(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [bridge.isReady, resetCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopTimer(), [stopTimer]);

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

  // ── resign ────────────────────────────────────────────────────────────────
  const resign = useCallback(() => {
    if (result) return;
    stopTimer();
    const winner = resolvedColor === PlayerColor.WHITE ? "BLACK" : "WHITE";
    const r: GameResult = { winner, reason: "resign" };
    setResult(r);
    resultRef.current = r;
  }, [result, resolvedColor, stopTimer]);

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

      // Recompute reversibleMoveCount — count trailing moves with no captures/promotions
      let revCount = 0;
      for (let i = newHistory.length - 1; i >= 0; i--) {
        if (newHistory[i].captureCount > 0) break;
        revCount++;
      }
      reversibleMoveCount.current = revCount;

      // Restore board + state
      const restoredBoard = BoardState.fromFen(restoredFen);
      const prevPlayer = newHistory.length % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;

      stopTimer();
      setFen(restoredFen);
      setBoard(restoredBoard);
      setCurrentPlayer(prevPlayer);
      setResult(null);
      resultRef.current = null;
      setSelectedSquare(null);
      setValidDestinations([]);
      setCapturablePieces([]);
      setCapturedBy(newCapturedBy);
      setLastMove(null); // from/to not stored in history, clear highlight
      setMoveCount((c) => Math.max(0, c - movesToPop));

      // Async: reload legal moves + restart timer
      bridge.generateMoves(restoredFen).then((moves) => {
        setLegalMoves(moves);
        setCapturablePieces(computeCapturables(moves));
        startTimer(prevPlayer);
      }).catch(() => {});

      return newHistory;
    });
  }, [result, resolvedColor, bridge, computeCapturables, stopTimer, startTimer]);

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopTimer();
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
    fenHistory.current = [INITIAL_FEN];
    reversibleMoveCount.current = 0;
    threeKingsCount.current = 0;
    endgameCount.current = 0;
    setTimeLeft({ WHITE: timeSeconds, BLACK: timeSeconds });
    // Increment last — triggers the init effect after all state is wiped
    setResetCount((n) => n + 1);
  }, [stopTimer, timeSeconds]);

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
    moveCount,
    invalidMoveSignal,
    // Board flip — mobile vs web convention:
    //
    // Web engine: PDN 1-12 (WHITE) map to rows 0-2 (TOP) via position.toRowCol().
    //   → flipForPlayer = playerColor === WHITE  (flip to bring WHITE to bottom)
    //
    // Mobile GRID (buildGrid): PDN 1 is the bottom-left dark square, so PDN 1-12
    //   already appear at rows 5-7 (BOTTOM) without any flip.
    //   → flipBoard = playerColor === BLACK  (flip to bring BLACK to bottom)
    //
    // End result is identical behaviour: the human player's pieces are always at
    // the bottom of the board regardless of which colour they chose.
    flipBoard: resolvedColor === PlayerColor.BLACK,
    selectSquare,
    resign,
    reset,
    undo,
  };
}
