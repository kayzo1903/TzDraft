"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoardState,
  MkaguziEngine,
  Move,
  PlayerColor,
  Position,
  Piece,
  PieceType,
  Winner,
  isEngineReady,
  initEngine,
} from "@tzdraft/mkaguzi-engine";

// Build a PDN FEN string from a board state — used to send game history to
// the Mkaguzi engine so it can detect game-level repetitions.
function boardToFen(board: BoardState, player: PlayerColor): string {
  const stm = player === PlayerColor.WHITE ? "W" : "B";
  const w = board
    .getPiecesByColor(PlayerColor.WHITE)
    .map((p) => (p.isKing() ? `K${p.position.value}` : `${p.position.value}`))
    .sort()
    .join(",");
  const b = board
    .getPiecesByColor(PlayerColor.BLACK)
    .map((p) => (p.isKing() ? `K${p.position.value}` : `${p.position.value}`))
    .sort()
    .join(",");
  return `${stm}:W${w}:B${b}`;
}

// Art. 8.2: count how many times a FEN has appeared in history (≥3 = draw).
function countFenOccurrences(history: string[], fen: string): number {
  let n = 0;
  for (const f of history) if (f === fen) n++;
  return n;
}
import type {
  BoardState as UiBoardState,
  CaptureGhost,
  LastMoveState,
} from "@/components/game/Board";
import axiosInstance from "@/lib/axios";
import { unlockNextBotLevel } from "@/lib/game/bot-progression";
import { playMoveSound } from "@/lib/game/move-sound";
import { getBestMove } from "@/lib/ai/bot";

export interface LocalGameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  moveCount: number;
  moves: Move[];
  result: { winner: Winner; drawReason?: string } | null;
  isAiThinking: boolean;
  timeLeft: { WHITE: number; BLACK: number };
  endgameCountdown: { favored: PlayerColor | null; remaining: number } | null;
  mustContinueFrom: number | null;
  undoUsed: boolean;
  hintUsed: boolean;
  viewingMoveIndex: number;
}

const STORAGE_KEY = "tzdraft:local-game";

type SavedGame = {
  playerColor: PlayerColor;
  aiLevel: number;
  timeSeconds: number;
  currentPlayer: PlayerColor;
  moveCount: number;
  timeLeft: { WHITE: number; BLACK: number };
  endgameCountdown: { favored: PlayerColor | null; remaining: number } | null;
  thirtyMoveCount: number;
  mustContinueFrom: number | null;
  undoUsed: boolean;
  hintUsed?: boolean;
  moves: {
    id: string;
    gameId: string;
    moveNumber: number;
    player: PlayerColor;
    from: number;
    to: number;
    capturedSquares: number[];
    isPromotion: boolean;
    notation: string;
    createdAt: string;
  }[];
  pieces: {
    type: PieceType;
    color: PlayerColor;
    position: number;
  }[];
  result: { winner: Winner; drawReason?: string } | null;
};

const getOpponent = (player: PlayerColor): PlayerColor =>
  player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;

/** Returns true if PDN position sits on the a1-h8 long diagonal (row + col === 7). */
function isOnLongDiagonal(position: Position): boolean {
  const { row, col } = position.toRowCol();
  return row + col === 7;
}

/**
 * Art. 10 — Timeout result adjudication.
 * Returns the correct winner/draw given that `timedOutPlayer` ran out of clock.
 *
 * Art. 10.1: if the timed-out player has no legal moves → loss (no draw exception).
 * Art. 10.2: K vs K → draw.
 * Art. 10.3: stronger side timed out (2K vs 1K, K+Man vs 1K, 1K vs 2M) → draw.
 * Art. 10.4: lone king (weaker side) timed out in 2K/K+Man vs 1K →
 *   – long diagonal → draw,
 *   – ≥5 weak-side endgame moves survived → draw,
 *   – otherwise → loss.
 */
function computeTimeoutResult(
  board: BoardState,
  timedOutPlayer: PlayerColor,
  moveCount: number,
  endgameCountdown: { favored: PlayerColor | null; remaining: number } | null,
): { winner: Winner; drawReason?: string } {
  const opponent =
    timedOutPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
  const opponentWinner =
    opponent === PlayerColor.WHITE ? Winner.WHITE : Winner.BLACK;

  // Art. 10.1: no legal moves for the timed-out player → loss (clock expired on a losing position)
  const legal = MkaguziEngine.generateLegalMoves(board, timedOutPlayer, moveCount);
  if (legal.length === 0) {
    return { winner: opponentWinner };
  }

  const wp = board.getPiecesByColor(PlayerColor.WHITE);
  const bp = board.getPiecesByColor(PlayerColor.BLACK);
  const wk = wp.filter((p) => p.isKing()).length;
  const bk = bp.filter((p) => p.isKing()).length;
  const wm = wp.length - wk;
  const bm = bp.length - bk;

  // Art. 10.2: K vs K — neither side can force a win → draw
  if (wk === 1 && wm === 0 && bk === 1 && bm === 0) {
    return { winner: Winner.DRAW, drawReason: "timeout-kvk" };
  }

  // Art. 10.3: the STRONGER side timed out — they had the advantage, so draw is fair
  const timedWhite = timedOutPlayer === PlayerColor.WHITE;
  const timedBlack = timedOutPlayer === PlayerColor.BLACK;
  if (
    (timedWhite && wk === 2 && wm === 0 && bk === 1 && bm === 0) || // WHITE 2K vs BLACK 1K
    (timedBlack && bk === 2 && bm === 0 && wk === 1 && wm === 0) || // BLACK 2K vs WHITE 1K
    (timedWhite && wk === 1 && wm === 1 && bk === 1 && bm === 0) || // WHITE K+M vs BLACK 1K
    (timedBlack && bk === 1 && bm === 1 && wk === 1 && wm === 0) || // BLACK K+M vs WHITE 1K
    (timedWhite && wk === 1 && wm === 0 && bk === 0 && bm === 2) || // WHITE 1K vs BLACK 2M
    (timedBlack && bk === 1 && bm === 0 && wk === 0 && wm === 2)    // BLACK 1K vs WHITE 2M
  ) {
    return { winner: Winner.DRAW, drawReason: "timeout-insufficient" };
  }

  // Art. 10.4: WEAKER side (lone king) timed out in 2K vs 1K or K+Man vs 1K
  const timedOutPieces = timedWhite ? wp : bp;
  const opponentPieces = timedWhite ? bp : wp;
  const timedOutIsLoneKing =
    timedOutPieces.length === 1 &&
    timedOutPieces[0].isKing() &&
    opponentPieces.length === 2; // exactly 2 opp pieces = Art. 8.4 endgame

  if (timedOutIsLoneKing) {
    const loneKingPos = timedOutPieces[0].position;

    // Long diagonal → draw (Art. 10.4b)
    if (isOnLongDiagonal(loneKingPos)) {
      return { winner: Winner.DRAW, drawReason: "timeout-long-diagonal" };
    }

    // ≥5 weak-side moves survived in this endgame → draw (Art. 10.4c)
    // endgameCountdown.remaining starts at 5 and decrements on each weak-side move.
    // weakMovesMade = 5 − remaining.  When remaining reaches 0 the game already ended
    // as Art. 8.4 draw, so this branch is an extra safety net.
    const weakMovesMade = endgameCountdown != null ? Math.max(0, 5 - endgameCountdown.remaining) : 0;
    if (weakMovesMade >= 5) {
      return { winner: Winner.DRAW, drawReason: "timeout-endgame-survived" };
    }

    // Not on long diagonal, < 5 weak moves → loss
    return { winner: opponentWinner };
  }

  // Default: loss for the player who ran out of time
  return { winner: opponentWinner };
}

const toUiColor = (color: PlayerColor): "WHITE" | "BLACK" =>
  color === PlayerColor.WHITE ? "WHITE" : "BLACK";

const didHumanWin = (winner: Winner, humanColor: PlayerColor): boolean => {
  if (winner === Winner.DRAW) return false;
  if (humanColor === PlayerColor.WHITE) return winner === Winner.WHITE;
  return winner === Winner.BLACK;
};

const positionToIndex = (position: Position, flip: boolean): number => {
  const { row, col } = position.toRowCol();
  if (!flip) {
    return row * 8 + col;
  }
  return (7 - row) * 8 + (7 - col);
};

const indexToPosition = (index: number, flip: boolean): Position | null => {
  const row = Math.floor(index / 8);
  const col = index % 8;
  const mappedRow = flip ? 7 - row : row;
  const mappedCol = flip ? 7 - col : col;
  try {
    return Position.fromRowCol(mappedRow, mappedCol);
  } catch {
    return null;
  }
};

const boardToUiPieces = (board: BoardState, flip: boolean): UiBoardState => {
  const pieces: UiBoardState = {};
  for (const piece of board.getAllPieces()) {
    pieces[positionToIndex(piece.position, flip)] = {
      color: piece.color,
      isKing: piece.isKing(),
    };
  }
  return pieces;
};

const loadSavedGame = (
  aiLevel: number,
  playerColor: PlayerColor,
): {
  board: BoardState;
  currentPlayer: PlayerColor;
  moveCount: number;
  moves: Move[];
  result: { winner: Winner; drawReason?: string } | null;
  timeLeft: { WHITE: number; BLACK: number };
  endgameCountdown: { favored: PlayerColor | null; remaining: number } | null;
  thirtyMoveCount: number;
  mustContinueFrom: Position | null;
  undoUsed: boolean;
  hintUsed: boolean;
} | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;

    if (parsed.aiLevel !== aiLevel || parsed.playerColor !== playerColor) {
      return null;
    }

    const pieces = parsed.pieces.map(
      (p) => new Piece(p.type, p.color, new Position(p.position)),
    );
    const board = new BoardState(pieces);

    const moves = parsed.moves.map(
      (m) =>
        new Move(
          m.id,
          m.gameId,
          m.moveNumber,
          m.player,
          new Position(m.from),
          new Position(m.to),
          m.capturedSquares.map((v) => new Position(v)),
          m.isPromotion,
          m.notation,
          new Date(m.createdAt),
        ),
    );

    return {
      board,
      currentPlayer: parsed.currentPlayer,
      moveCount: parsed.moveCount,
      moves,
      result: parsed.result,
      timeLeft: parsed.timeLeft,
      endgameCountdown: parsed.endgameCountdown ?? null,
      thirtyMoveCount: parsed.thirtyMoveCount ?? 0,
      mustContinueFrom:
        typeof parsed.mustContinueFrom === "number"
          ? new Position(parsed.mustContinueFrom)
          : null,
      undoUsed: Boolean(parsed.undoUsed),
      hintUsed: Boolean(parsed.hintUsed),
    };
  } catch {
    return null;
  }
};

/** Returns the persisted player color for a saved game at this level (any state), or null. */
export const getSavedGamePlayerColor = (level: number): PlayerColor | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    if (parsed.aiLevel !== level) return null;
    return parsed.playerColor;
  } catch {
    return null;
  }
};

/**
 * Returns info about the currently saved in-progress AI game (no result yet),
 * or null if there is no game or the game has already finished.
 * Used to smart-route "Play with AI" directly back into the active game.
 */
export const getSavedGameInfo = (): {
  level: number;
  playerColor: PlayerColor;
  timeSeconds: number;
} | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    // Only resume if the game is still in progress (no result yet).
    if (parsed.result !== null && parsed.result !== undefined) return null;
    return {
      level: parsed.aiLevel,
      playerColor: parsed.playerColor,
      timeSeconds: parsed.timeSeconds ?? 600,
    };
  } catch {
    return null;
  }
};

const saveGame = (
  state: {
    board: BoardState;
    currentPlayer: PlayerColor;
    moveCount: number;
    moves: Move[];
    result: { winner: Winner; drawReason?: string } | null;
    timeLeft: { WHITE: number; BLACK: number };
    endgameCountdown: { favored: PlayerColor | null; remaining: number } | null;
    thirtyMoveCount: number;
    mustContinueFrom: Position | null;
    undoUsed: boolean;
    hintUsed: boolean;
  },
  aiLevel: number,
  playerColor: PlayerColor,
  timeSeconds: number,
) => {
  if (typeof window === "undefined") return;
  const pieces = state.board.getAllPieces().map((p) => ({
    type: p.type,
    color: p.color,
    position: p.position.value,
  }));

  const moves = state.moves.map((m) => ({
    id: m.id,
    gameId: m.gameId,
    moveNumber: m.moveNumber,
    player: m.player,
    from: m.from.value,
    to: m.to.value,
    capturedSquares: m.capturedSquares.map((p) => p.value),
    isPromotion: m.isPromotion,
    notation: m.notation,
    createdAt: m.createdAt.toISOString(),
  }));

  const payload: SavedGame = {
    playerColor,
    aiLevel,
    timeSeconds,
    currentPlayer: state.currentPlayer,
    moveCount: state.moveCount,
    moves,
    pieces,
    timeLeft: state.timeLeft,
    endgameCountdown: state.endgameCountdown,
    thirtyMoveCount: state.thirtyMoveCount,
    result: state.result,
    mustContinueFrom: state.mustContinueFrom?.value ?? null,
    undoUsed: state.undoUsed,
    hintUsed: state.hintUsed,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const useLocalGame = (
  aiLevel: number,
  playerColor: PlayerColor,
  timeSeconds: number,
  shouldPersistGuestProgress = true,
) => {
  // Engine state uses WHITE at the top by default; flip only when the human plays WHITE.
  const flipForPlayer = playerColor === PlayerColor.WHITE;
  const loaded = loadSavedGame(aiLevel, playerColor);
  const [board, setBoard] = useState<BoardState>(() =>
    loaded ? loaded.board : MkaguziEngine.createInitialState(),
  );
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>(
    loaded ? loaded.currentPlayer : PlayerColor.WHITE,
  );
  const [moveCount, setMoveCount] = useState(loaded ? loaded.moveCount : 0);
  const [moves, setMoves] = useState<Move[]>(loaded ? loaded.moves : []);
  const [result, setResult] = useState<{ winner: Winner; drawReason?: string } | null>(
    loaded ? loaded.result : null,
  );
  const [undoUsed, setUndoUsed] = useState<boolean>(loaded?.undoUsed ?? false);
  const [hintUsed, setHintUsed] = useState<boolean>(loaded?.hintUsed ?? false);
  const [hintMove, setHintMove] = useState<{ from: number; to: number } | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ WHITE: number; BLACK: number }>(
    loaded?.timeLeft ?? { WHITE: timeSeconds, BLACK: timeSeconds },
  );
  const [endgameCountdown, setEndgameCountdown] = useState<{
    favored: PlayerColor | null;
    remaining: number;
  } | null>(loaded?.endgameCountdown ?? null);
  const [thirtyMoveCount, setThirtyMoveCount] = useState<number>(
    loaded?.thirtyMoveCount ?? 0,
  );
  // Refs so evaluateEndgameCountdown can read current state without stale closures
  const endgameCountdownRef = useRef(loaded?.endgameCountdown ?? null);
  const thirtyMoveCountRef = useRef(loaded?.thirtyMoveCount ?? 0);
  endgameCountdownRef.current = endgameCountdown;
  thirtyMoveCountRef.current = thirtyMoveCount;
  const [mustContinueFrom, setMustContinueFrom] = useState<Position | null>(
    loaded?.mustContinueFrom ?? null,
  );
  const [viewingMoveIndex, setViewingMoveIndex] = useState<number>(loaded ? loaded.moves.length : 0);
  const [lastMove, setLastMove] = useState<LastMoveState>(null);
  const [capturedGhosts, setCapturedGhosts] = useState<CaptureGhost[]>([]);
  const fenHistoryRef = useRef<string[]>([
    boardToFen(loaded ? loaded.board : MkaguziEngine.createInitialState(), PlayerColor.WHITE),
  ]);
  const aiTimeoutRef = useRef<number | null>(null);
  const captureCleanupTimeoutsRef = useRef<number[]>([]);
  const captureGhostIdRef = useRef(0);
  const initialBoardRef = useRef<BoardState>(MkaguziEngine.createInitialState());
  const moveAudioRef = useRef<HTMLAudioElement | null>(null);
  const longMoveAudioRef = useRef<HTMLAudioElement | null>(null);
  const captureAudioRef = useRef<HTMLAudioElement | null>(null);
  const multiCaptureAudioRef = useRef<HTMLAudioElement | null>(null);
  const startAudioRef = useRef<HTMLAudioElement | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const prevResultRef = useRef<Winner | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("tzdraft:muted") === "true";
  });

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      window.localStorage.setItem("tzdraft:muted", String(next));
      return next;
    });
  }, []);

  // Re-render once when the WASM engine finishes loading so legalMoves is computed.
  const [engineReady, setEngineReady] = useState(isEngineReady());
  useEffect(() => {
    if (engineReady) return;
    initEngine("/wasm/mkaguzi_wasm.js").then(() => setEngineReady(true)).catch((e) => console.error("[Mkaguzi] WASM init failed:", e));
  }, [engineReady]);

  const boardAtViewingIndex = useMemo(() => {
    if (viewingMoveIndex === moves.length) return board;

    let currentBoard = initialBoardRef.current;
    for (let i = 0; i < viewingMoveIndex; i++) {
      currentBoard = MkaguziEngine.applyMove(currentBoard, moves[i]);
    }
    return currentBoard;
  }, [board, moves, viewingMoveIndex]);

  const pieces = useMemo(
    () => boardToUiPieces(boardAtViewingIndex, flipForPlayer),
    [boardAtViewingIndex, flipForPlayer],
  );

  const visibleLastMove = useMemo<LastMoveState>(() => {
    if (viewingMoveIndex === 0) return null;
    const move = moves[viewingMoveIndex - 1];
    if (!move) return null;
    return {
      from: positionToIndex(move.from, flipForPlayer),
      to: positionToIndex(move.to, flipForPlayer),
    };
  }, [moves, viewingMoveIndex, flipForPlayer]);

  const legalMoves = useMemo(() => {
    if (viewingMoveIndex !== moves.length) return {};

    const map: Record<number, number[]> = {};
    const movesList = MkaguziEngine.generateLegalMoves(
      board,
      currentPlayer,
      moveCount,
    );
    const filteredMoves = mustContinueFrom
      ? movesList.filter((m) => m.from.equals(mustContinueFrom))
      : movesList;
    for (const move of filteredMoves) {
      const fromIndex = positionToIndex(move.from, flipForPlayer);
      const toIndex = positionToIndex(move.to, flipForPlayer);
      if (!map[fromIndex]) map[fromIndex] = [];
      map[fromIndex].push(toIndex);
    }
    return map;
  }, [board, currentPlayer, moveCount, flipForPlayer, mustContinueFrom, engineReady, viewingMoveIndex, moves.length]);
  const forcedPieces = useMemo(() => {
    if (mustContinueFrom) {
      return [positionToIndex(mustContinueFrom, flipForPlayer)];
    }
    const moves = MkaguziEngine.generateLegalMoves(
      board,
      currentPlayer,
      moveCount,
    );
    const captureMoves = moves.filter((m) => m.capturedSquares.length > 0);
    if (captureMoves.length === 0) return [];
    const set = new Set<number>();
    for (const move of captureMoves) {
      set.add(positionToIndex(move.from, flipForPlayer));
    }
    return Array.from(set);
  }, [board, currentPlayer, moveCount, flipForPlayer, mustContinueFrom]);

  // Returns the draw reason string if a draw should be declared, null otherwise.
  // Uses refs (not state directly) so the callback stays stable with [] deps.
  const evaluateEndgameCountdown = useCallback(
    (nextBoard: BoardState, movePlayer: PlayerColor, hadCapture: boolean): string | null => {
      const whitePieces = nextBoard.getPiecesByColor(PlayerColor.WHITE);
      const blackPieces = nextBoard.getPiecesByColor(PlayerColor.BLACK);

      const whiteKings = whitePieces.filter((p) => p.isKing()).length;
      const blackKings = blackPieces.filter((p) => p.isKing()).length;
      const whiteMen = whitePieces.length - whiteKings;
      const blackMen = blackPieces.length - blackKings;

      // Article 8.3 — 30 full moves = 60 half-moves with kings only and no captures.
      const allKings = whiteMen === 0 && blackMen === 0;
      const newThirtyCount =
        !allKings || hadCapture ? 0 : thirtyMoveCountRef.current + 1;
      setThirtyMoveCount(newThirtyCount);
      thirtyMoveCountRef.current = newThirtyCount;
      if (newThirtyCount >= 60) return '30-move';

      // Classify endgame scenario for timed draws.
      // K vs K is intentionally excluded — in TZD kings can capture kings.
      const whiteOnlyKing = whitePieces.length === 1 && whiteKings === 1;
      const blackOnlyKing = blackPieces.length === 1 && blackKings === 1;
      const whiteTwoKings = whitePieces.length === 2 && whiteKings === 2;
      const blackTwoKings = blackPieces.length === 2 && blackKings === 2;
      const whiteKingMan =
        whitePieces.length === 2 && whiteKings === 1 && whiteMen === 1;
      const blackKingMan =
        blackPieces.length === 2 && blackKings === 1 && blackMen === 1;
      const whiteThreePlusKings = whiteKings >= 3 && whiteMen === 0;
      const blackThreePlusKings = blackKings >= 3 && blackMen === 0;

      let favored: PlayerColor | null = null;
      let limit = 0;

      if (whiteOnlyKing && blackThreePlusKings) { favored = PlayerColor.BLACK; limit = 12; }
      else if (blackOnlyKing && whiteThreePlusKings) { favored = PlayerColor.WHITE; limit = 12; }
      else if (whiteOnlyKing && blackTwoKings) { favored = PlayerColor.BLACK; limit = 5; }
      else if (blackOnlyKing && whiteTwoKings) { favored = PlayerColor.WHITE; limit = 5; }
      else if (whiteOnlyKing && blackKingMan) { favored = PlayerColor.BLACK; limit = 5; }
      else if (blackOnlyKing && whiteKingMan) { favored = PlayerColor.WHITE; limit = 5; }
      // K vs K intentionally omitted — kings can capture kings in TZD

      if (limit === 0) {
        setEndgameCountdown(null);
        endgameCountdownRef.current = null;
        return null;
      }

      const prev = endgameCountdownRef.current;
      const isNewScenario = !prev || prev.favored !== favored;
      const base = isNewScenario ? limit : prev.remaining;
      // Art. 8.5 (limit=12): count STRONG-side (favored) moves.
      // Art. 8.4 (limit=5):  count WEAK-side (non-favored) moves.
      const shouldDecrement =
        limit === 12 ? movePlayer === favored : movePlayer !== favored;

      let newCountdown: { favored: PlayerColor | null; remaining: number };
      if (!shouldDecrement) {
        newCountdown = isNewScenario ? { favored, remaining: base } : prev;
      } else {
        const remaining = Math.max(0, base - 1);
        newCountdown = { favored, remaining };
      }

      setEndgameCountdown(newCountdown);
      endgameCountdownRef.current = newCountdown;
      return newCountdown.remaining === 0
        ? (limit === 12 ? 'three-kings' : 'endgame')
        : null;
    },
    [],
  );

  const applyMove = useCallback(
    (move: Move) => {
      if (!isMuted) {
        playMoveSound(
          {
            from: move.from,
            to: move.to,
            capturedCount: move.capturedSquares.length,
          },
          {
            normal: moveAudioRef.current,
            long: longMoveAudioRef.current,
            capture: captureAudioRef.current,
            multiCapture: multiCaptureAudioRef.current,
          },
        );
      }
      const fromIndex = positionToIndex(move.from, flipForPlayer);
      const toIndex = positionToIndex(move.to, flipForPlayer);
      setLastMove({ from: fromIndex, to: toIndex });
      setHintMove(null);

      const moveCaptures = move.capturedSquares.reduce<CaptureGhost[]>(
        (accumulator, capturedPosition) => {
          const capturedPiece = board.getPieceAt(capturedPosition);
          if (!capturedPiece) return accumulator;
          accumulator.push({
            id: ++captureGhostIdRef.current,
            index: positionToIndex(capturedPosition, flipForPlayer),
            piece: {
              color: toUiColor(capturedPiece.color),
              isKing: capturedPiece.isKing() ? true : undefined,
            },
          });
          return accumulator;
        },
        [],
      );
      if (moveCaptures.length > 0) {
        setCapturedGhosts((prev) => [...prev, ...moveCaptures].slice(-24));
        const cleanupTimeout = window.setTimeout(() => {
          setCapturedGhosts((prev) =>
            prev.filter(
              (ghost) =>
                !moveCaptures.some((captured) => captured.id === ghost.id),
            ),
          );
          captureCleanupTimeoutsRef.current =
            captureCleanupTimeoutsRef.current.filter(
              (timeoutId) => timeoutId !== cleanupTimeout,
            );
        }, 240);
        captureCleanupTimeoutsRef.current.push(cleanupTimeout);
      }

      const nextBoard = MkaguziEngine.applyMove(boardAtViewingIndex, move);
      const nextPlayer = getOpponent(move.player);

      // Track FEN history for Mkaguzi game-level repetition detection
      fenHistoryRef.current.push(boardToFen(nextBoard, nextPlayer));

      setBoard(nextBoard);
      setMoves((prev) => {
        const next = [...prev.slice(0, viewingMoveIndex), move];
        setViewingMoveIndex(next.length);
        return next;
      });
      setMoveCount((prev) => viewingMoveIndex + 1);
      // TZD free-choice: a complete capture path is applied atomically; turn
      // always passes to the opponent — never force a "continue capturing" chain.
      setMustContinueFrom(null);
      setCurrentPlayer(nextPlayer);
      const endgameDrawReason = evaluateEndgameCountdown(
        nextBoard,
        move.player,
        move.capturedSquares.length > 0,
      );

      // Art. 8.2 — threefold repetition: same position with same side-to-move 3× → draw
      const newFen = fenHistoryRef.current[fenHistoryRef.current.length - 1];
      const isRepetition = countFenOccurrences(fenHistoryRef.current, newFen) >= 3;

      const drawReason = endgameDrawReason ?? (isRepetition ? 'repetition' : null);

      const gameResult = MkaguziEngine.evaluateGameResult(nextBoard, nextPlayer);
      if (gameResult) {
        setResult({ winner: gameResult.winner });
      } else if (drawReason) {
        setResult({ winner: Winner.DRAW, drawReason });
      }
    },
    [board, currentPlayer, evaluateEndgameCountdown, flipForPlayer, viewingMoveIndex, isMuted],
  );

  const makeMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (result) return;
      if (currentPlayer !== playerColor) return;

      const from = indexToPosition(fromIndex, flipForPlayer);
      const to = indexToPosition(toIndex, flipForPlayer);
      if (!from || !to) return;

      const legalMoves = MkaguziEngine.generateLegalMoves(
        board,
        currentPlayer,
        moveCount,
      );
      const filteredMoves = mustContinueFrom
        ? legalMoves.filter((m) => m.from.equals(mustContinueFrom))
        : legalMoves;
      const match = filteredMoves.find(
        (move) => move.from.equals(from) && move.to.equals(to),
      );

      if (match) {
        if (viewingMoveIndex !== moves.length) {
          setUndoUsed(true);
        }
        applyMove(match);
      }
    },
    [
      applyMove,
      board,
      currentPlayer,
      moveCount,
      playerColor,
      result,
      mustContinueFrom,
      flipForPlayer,
      viewingMoveIndex,
      moves.length,
    ],
  );

  const reset = useCallback(() => {
    initialBoardRef.current = MkaguziEngine.createInitialState();
    fenHistoryRef.current = [boardToFen(initialBoardRef.current, PlayerColor.WHITE)];
    setBoard(initialBoardRef.current);
    setCurrentPlayer(PlayerColor.WHITE);
    setMoveCount(0);
    setMoves([]);
    setViewingMoveIndex(0);
    setResult(null);
    setIsAiThinking(false);
    setUndoUsed(false);
    setHintUsed(false);
    setHintMove(null);
    setTimeLeft({ WHITE: timeSeconds, BLACK: timeSeconds });
    setEndgameCountdown(null);
    endgameCountdownRef.current = null;
    setThirtyMoveCount(0);
    thirtyMoveCountRef.current = 0;
    setMustContinueFrom(null);
    setLastMove(null);
    setCapturedGhosts([]);
    for (const timeoutId of captureCleanupTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }
    captureCleanupTimeoutsRef.current = [];
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    if (startAudioRef.current) {
      startAudioRef.current.currentTime = 0;
      startAudioRef.current.play().catch(() => {});
    }
  }, []);

  const resign = useCallback(() => {
    const winner =
      playerColor === PlayerColor.WHITE ? Winner.BLACK : Winner.WHITE;
    setResult({ winner });
  }, [playerColor]);

  const undo = useCallback(() => {
    setUndoUsed(true);
    if (aiTimeoutRef.current !== null) {
      window.clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    if (moves.length === 0) return;

    let newMoves = [...moves];
    const lastMove = newMoves[newMoves.length - 1];
    if (lastMove.player !== playerColor && newMoves.length >= 2) {
      newMoves = newMoves.slice(0, -2);
    } else {
      newMoves = newMoves.slice(0, -1);
    }

    let nextBoard = initialBoardRef.current;
    const rebuiltFens: string[] = [boardToFen(initialBoardRef.current, PlayerColor.WHITE)];
    for (const move of newMoves) {
      nextBoard = MkaguziEngine.applyMove(nextBoard, move);
      const nextP = getOpponent(move.player);
      rebuiltFens.push(boardToFen(nextBoard, nextP));
    }
    fenHistoryRef.current = rebuiltFens;

    const nextPlayer =
      newMoves.length === 0
        ? PlayerColor.WHITE
        : getOpponent(newMoves[newMoves.length - 1].player);

    setBoard(nextBoard);
    setMoves(newMoves);
    setMoveCount(newMoves.length);
    setCurrentPlayer(nextPlayer);
    setResult(null);
    setIsAiThinking(false);
    setEndgameCountdown(null);
    endgameCountdownRef.current = null;
    setThirtyMoveCount(0);
    thirtyMoveCountRef.current = 0;
    setMustContinueFrom(null);
    setLastMove(null);
    setCapturedGhosts([]);
    for (const timeoutId of captureCleanupTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }
    captureCleanupTimeoutsRef.current = [];
  }, [moves, playerColor]);

  const getHint = useCallback(async () => {
    if (result || currentPlayer !== playerColor || isAiThinking) return;
    setHintUsed(true);
    try {
      const hintLevel = Math.min(aiLevel + 2, 10);
      const move = await getBestMove(board, playerColor, hintLevel, fenHistoryRef.current);
      if (!move) return;
      setHintMove({
        from: positionToIndex(move.from, flipForPlayer),
        to: positionToIndex(move.to, flipForPlayer),
      });
    } catch {
      // ignore hint errors silently
    }
  }, [result, currentPlayer, playerColor, isAiThinking, aiLevel, board, flipForPlayer]);

  const goBack = useCallback(() => {
    setViewingMoveIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goForward = useCallback(() => {
    setViewingMoveIndex((prev) => Math.min(moves.length, prev + 1));
  }, [moves.length]);

  const goToStart = useCallback(() => {
    setViewingMoveIndex(0);
  }, []);

  const goToEnd = useCallback(() => {
    setViewingMoveIndex(moves.length);
  }, [moves.length]);

  const goToMove = useCallback((index: number) => {
    setViewingMoveIndex(Math.min(Math.max(0, index), moves.length));
  }, [moves.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const moveAudio = new Audio("/sfx/move-tap.wav");
    moveAudio.preload = "auto";
    moveAudio.volume = 0.48;
    moveAudioRef.current = moveAudio;

    const longMoveAudio = new Audio("/sfx/move-slide.wav");
    longMoveAudio.preload = "auto";
    longMoveAudio.volume = 0.52;
    longMoveAudioRef.current = longMoveAudio;

    const captureAudio = new Audio("/sfx/move-capture.wav");
    captureAudio.preload = "auto";
    captureAudio.volume = 0.6;
    captureAudioRef.current = captureAudio;

    const multiCaptureAudio = new Audio("/sfx/move-knock-real.wav");
    multiCaptureAudio.preload = "auto";
    multiCaptureAudio.volume = 0.62;
    multiCaptureAudioRef.current = multiCaptureAudio;

    const startAudio = new Audio("/sfx/start.mp3");
    startAudio.preload = "auto";
    startAudio.volume = 0.5;
    startAudioRef.current = startAudio;

    const warningAudio = new Audio("/sfx/warning.wav");
    warningAudio.preload = "auto";
    warningAudio.volume = 0.6;
    warningAudioRef.current = warningAudio;

    const victoryAudio = new Audio("/sfx/victory.mp3");
    victoryAudio.preload = "auto";
    victoryAudio.volume = 0.6;
    victoryAudioRef.current = victoryAudio;

    if (!startedRef.current && !loaded) {
      if (!isMuted && startAudioRef.current) {
        startAudioRef.current.currentTime = 0;
        startAudioRef.current.play().catch(() => {});
      }
      startedRef.current = true;
    }
    return () => {
      for (const timeoutId of captureCleanupTimeoutsRef.current) {
        window.clearTimeout(timeoutId);
      }
      captureCleanupTimeoutsRef.current = [];
      moveAudioRef.current = null;
      longMoveAudioRef.current = null;
      captureAudioRef.current = null;
      multiCaptureAudioRef.current = null;
      startAudioRef.current = null;
      warningAudioRef.current = null;
      victoryAudioRef.current = null;
    };
  }, [loaded]);

  useEffect(() => {
    const winner = result?.winner ?? null;
    if (!winner || winner === prevResultRef.current) return;
    prevResultRef.current = winner;
    if (!isMuted && victoryAudioRef.current) {
      victoryAudioRef.current.currentTime = 0;
      victoryAudioRef.current.play().catch(() => {});
    }
  }, [result, isMuted]);

  useEffect(() => {
    if (!result) return;
    if (!shouldPersistGuestProgress) return;
    if (undoUsed) return;
    if (hintUsed) return;
    if (!didHumanWin(result.winner, playerColor)) return;

    unlockNextBotLevel(aiLevel);
  }, [aiLevel, hintUsed, playerColor, result, shouldPersistGuestProgress, undoUsed]);

  const playWarning = useCallback(() => {
    if (!isMuted && warningAudioRef.current) {
      warningAudioRef.current.currentTime = 0;
      warningAudioRef.current.play().catch(() => {});
    }
  }, [isMuted]);

  useEffect(() => {
    if (aiTimeoutRef.current !== null) {
      window.clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    if (result) return;
    if (currentPlayer === playerColor) return;

    const thinkDelayMs = 320 + Math.floor(Math.random() * 260);
    setIsAiThinking(true);

    // ── Local Mkaguzi WASM engine for levels 1-11 ────────────────────────
    // Runs in a Web Worker (async) so the UI thread stays responsive.
    // Levels 1-11 use WASM so tier-based strength capping in getParams() applies.
    if (aiLevel < 12) {
      aiTimeoutRef.current = window.setTimeout(async () => {
        aiTimeoutRef.current = null;
        try {
          const move = await getBestMove(board, currentPlayer, aiLevel, fenHistoryRef.current);
          if (move) {
            applyMove(move);
          } else if (!isEngineReady()) {
            // WASM still initialising — clear thinking flag; the engineReady
            // state flip will re-trigger this effect once WASM is loaded.
          } else {
            const gameResult = MkaguziEngine.evaluateGameResult(
              board,
              currentPlayer,
            );
            if (gameResult) setResult({ winner: gameResult.winner });
          }
        } catch (e) {
          // WASM search crashed (likely stack overflow — rebuild with -sSTACK_SIZE=4MB).
          // Fall back to a random legal move so the game stays playable.
          console.error("[bot] WASM search aborted, using random fallback:", e);
          const legalMoves = MkaguziEngine.generateLegalMoves(board, currentPlayer, moveCount);
          if (legalMoves.length > 0) {
            applyMove(legalMoves[Math.floor(Math.random() * legalMoves.length)]);
          }
        } finally {
          setIsAiThinking(false);
        }
      }, thinkDelayMs);

      return () => {
        if (aiTimeoutRef.current !== null) {
          window.clearTimeout(aiTimeoutRef.current);
          aiTimeoutRef.current = null;
        }
      };
    }

    // ── Backend engine for levels 10+ (SiDra 10-14 / Mkaguzi 15-19) ──────
    const fetchMove = async () => {
      try {
        const payloadPieces = board.getAllPieces().map((p) => ({
          type: p.isKing() ? "KING" : "MAN",
          color: p.color === PlayerColor.WHITE ? "WHITE" : "BLACK",
          position: p.position.value,
        }));

        const currentPlayerStr =
          currentPlayer === PlayerColor.WHITE ? "WHITE" : "BLACK";

        // Send the last 20 prior FENs (excluding current position) so
        // Mkaguzi can detect game-level repetitions.
        const priorFens = fenHistoryRef.current.slice(
          Math.max(0, fenHistoryRef.current.length - 21),
          fenHistoryRef.current.length - 1,
        );

        const { data } = await axiosInstance.post("/ai/move", {
          boardStatePieces: payloadPieces,
          currentPlayer: currentPlayerStr,
          aiLevel,
          timeLimitMs: 2500,
          mustContinueFrom: mustContinueFrom?.value ?? null,
          history: priorFens,
        });

        const aiMoveData = data.data;
        if (aiMoveData) {
          const legal = MkaguziEngine.generateLegalMoves(
            board,
            currentPlayer,
            moveCount,
          );
          // Filter to continuation moves if we're in a multi-jump chain
          const candidates = mustContinueFrom
            ? legal.filter((m) => m.from.equals(mustContinueFrom))
            : legal;

          let match = candidates.find(
            (m) =>
              m.from.value === aiMoveData.from && m.to.value === aiMoveData.to,
          );
          // Best-effort fallback: same starting square
          if (!match && candidates.length > 0) {
            match = candidates.find((m) => m.from.value === aiMoveData.from);
          }

          if (match) {
            applyMove(match);
            return;
          }
        }

        // Backend returned null or no match — check for game over
        const aiLegalMoves = MkaguziEngine.generateLegalMoves(
          board,
          currentPlayer,
          moveCount,
        );
        if (aiLegalMoves.length === 0) {
          // AI has no legal moves — declare the opponent as winner
          const gameResult = MkaguziEngine.evaluateGameResult(
            board,
            currentPlayer,
          );
          const winner =
            gameResult?.winner ??
            (currentPlayer === PlayerColor.WHITE
              ? Winner.BLACK
              : Winner.WHITE);
          setResult({ winner });
        } else {
          // Backend returned null or bad move — fall back to local Mkaguzi engine
          const fallbackMove = await getBestMove(board, currentPlayer, 9, fenHistoryRef.current);
          if (fallbackMove) {
            applyMove(fallbackMove);
          } else {
            setResult({
              winner:
                currentPlayer === PlayerColor.WHITE
                  ? Winner.BLACK
                  : Winner.WHITE,
            });
          }
        }
      } catch (e) {
        // Network / engine failure → fall back to local engine at depth 5
        console.warn("AI backend unreachable, using local fallback:", e);
        try {
          const fallbackMove = await getBestMove(board, currentPlayer, 9, fenHistoryRef.current);
          if (fallbackMove) {
            applyMove(fallbackMove);
          } else {
            const gameResult = MkaguziEngine.evaluateGameResult(
              board,
              currentPlayer,
            );
            if (gameResult) setResult({ winner: gameResult.winner });
          }
        } catch (fallbackErr) {
          console.error("Local fallback also failed:", fallbackErr);
        }
      } finally {
        setIsAiThinking(false);
      }
    };

    aiTimeoutRef.current = window.setTimeout(() => {
      fetchMove();
      aiTimeoutRef.current = null;
    }, thinkDelayMs);

    return () => {
      if (aiTimeoutRef.current !== null) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, [
    aiLevel,
    applyMove,
    board,
    currentPlayer,
    engineReady,
    playerColor,
    result,
    moveCount,
    mustContinueFrom,
  ]);

  useEffect(() => {
    if (result || timeSeconds === 0) return;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        const next = { ...prev };
        if (currentPlayer === PlayerColor.WHITE) {
          next.WHITE = Math.max(0, next.WHITE - 1);
        } else {
          next.BLACK = Math.max(0, next.BLACK - 1);
        }
        // Art. 10: apply TZD-specific timeout-draw rules
        if (next.WHITE === 0) {
          const r = computeTimeoutResult(board, PlayerColor.WHITE, moveCount, endgameCountdownRef.current);
          setResult(r);
        } else if (next.BLACK === 0) {
          const r = computeTimeoutResult(board, PlayerColor.BLACK, moveCount, endgameCountdownRef.current);
          setResult(r);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [board, currentPlayer, moveCount, result, timeSeconds]);
  useEffect(() => {
    if (result) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    saveGame(
      {
        board,
        currentPlayer,
        moveCount,
        moves,
        result,
        timeLeft,
        endgameCountdown,
        thirtyMoveCount,
        mustContinueFrom,
        undoUsed,
        hintUsed,
      },
      aiLevel,
      playerColor,
      timeSeconds,
    );
  }, [
    board,
    currentPlayer,
    moveCount,
    moves,
    result,
    timeLeft,
    endgameCountdown,
    thirtyMoveCount,
    mustContinueFrom,
    undoUsed,
    hintUsed,
    aiLevel,
    playerColor,
    timeSeconds,
  ]);

  return {
    state: {
      board,
      currentPlayer,
      moveCount,
      moves,
      result,
      isAiThinking,
      timeLeft,
      endgameCountdown,
      mustContinueFrom: mustContinueFrom
        ? positionToIndex(mustContinueFrom, flipForPlayer)
        : null,
        undoUsed,
        hintUsed,
        viewingMoveIndex,
      } as LocalGameState,
      pieces,
      lastMove: visibleLastMove,
      capturedGhosts,
      hintMove,
      legalMoves,
      forcedPieces,
      flipBoard: flipForPlayer,
      engineReady,
      playWarning,
      undo,
      resign,
      makeMove,
      reset,
      getHint,
      goBack,
      goForward,
      goToStart,
      goToEnd,
      goToMove,
      isMuted,
      toggleMute,
    };
  };
