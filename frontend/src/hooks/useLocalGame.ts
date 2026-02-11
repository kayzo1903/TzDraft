"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoardState,
  CakeEngine,
  CaptureFindingService,
  Move,
  PlayerColor,
  Position,
  Piece,
  PieceType,
  Winner,
} from "@tzdraft/cake-engine";
import type { BoardState as UiBoardState } from "@/components/game/Board";
import { getBestMove } from "@/lib/ai/bot";

export interface LocalGameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  moveCount: number;
  moves: Move[];
  result: { winner: Winner } | null;
  isAiThinking: boolean;
  timeLeft: { WHITE: number; BLACK: number };
  endgameCountdown: { favored: PlayerColor; remaining: number } | null;
  mustContinueFrom: number | null;
}

const STORAGE_KEY = "tzdraft:local-game";

type SavedGame = {
  playerColor: PlayerColor;
  aiLevel: number;
  currentPlayer: PlayerColor;
  moveCount: number;
  timeLeft: { WHITE: number; BLACK: number };
  endgameCountdown: { favored: PlayerColor; remaining: number } | null;
  mustContinueFrom: number | null;
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
  result: { winner: Winner } | null;
};

const getOpponent = (player: PlayerColor): PlayerColor =>
  player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;

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
  result: { winner: Winner } | null;
  timeLeft: { WHITE: number; BLACK: number };
  endgameCountdown: { favored: PlayerColor; remaining: number } | null;
  mustContinueFrom: Position | null;
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
      mustContinueFrom:
        typeof parsed.mustContinueFrom === "number"
          ? new Position(parsed.mustContinueFrom)
          : null,
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
    result: { winner: Winner } | null;
    timeLeft: { WHITE: number; BLACK: number };
    endgameCountdown: { favored: PlayerColor; remaining: number } | null;
    mustContinueFrom: Position | null;
  },
  aiLevel: number,
  playerColor: PlayerColor,
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
    currentPlayer: state.currentPlayer,
    moveCount: state.moveCount,
    moves,
    pieces,
    timeLeft: state.timeLeft,
    endgameCountdown: state.endgameCountdown,
    result: state.result,
    mustContinueFrom: state.mustContinueFrom?.value ?? null,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const useLocalGame = (
  aiLevel: number,
  playerColor: PlayerColor,
  timeSeconds: number,
) => {
  // Engine state uses WHITE at the top by default; flip only when the human plays WHITE.
  const flipForPlayer = playerColor === PlayerColor.WHITE;
  const loaded = loadSavedGame(aiLevel, playerColor);
  const [board, setBoard] = useState<BoardState>(() =>
    loaded ? loaded.board : CakeEngine.createInitialState(),
  );
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>(
    loaded ? loaded.currentPlayer : PlayerColor.WHITE,
  );
  const [moveCount, setMoveCount] = useState(
    loaded ? loaded.moveCount : 0,
  );
  const [moves, setMoves] = useState<Move[]>(loaded ? loaded.moves : []);
  const [result, setResult] = useState<{ winner: Winner } | null>(
    loaded ? loaded.result : null,
  );
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ WHITE: number; BLACK: number }>(
    loaded?.timeLeft ?? { WHITE: timeSeconds, BLACK: timeSeconds },
  );
  const [endgameCountdown, setEndgameCountdown] = useState<{
    favored: PlayerColor;
    remaining: number;
  } | null>(loaded?.endgameCountdown ?? null);
  const [mustContinueFrom, setMustContinueFrom] = useState<Position | null>(
    loaded?.mustContinueFrom ?? null,
  );
  const aiTimeoutRef = useRef<number | null>(null);
  const initialBoardRef = useRef<BoardState>(CakeEngine.createInitialState());
  const moveAudioRef = useRef<HTMLAudioElement | null>(null);
  const startAudioRef = useRef<HTMLAudioElement | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const prevResultRef = useRef<Winner | null>(null);

  const pieces = useMemo(
    () => boardToUiPieces(board, flipForPlayer),
    [board, flipForPlayer],
  );
  const legalMoves = useMemo(() => {
    const map: Record<number, number[]> = {};
    const moves = CakeEngine.generateLegalMoves(board, currentPlayer, moveCount);
    const filteredMoves =
      mustContinueFrom
        ? moves.filter((m) => m.from.equals(mustContinueFrom))
        : moves;
    for (const move of filteredMoves) {
      const fromIndex = positionToIndex(move.from, flipForPlayer);
      const toIndex = positionToIndex(move.to, flipForPlayer);
      if (!map[fromIndex]) map[fromIndex] = [];
      map[fromIndex].push(toIndex);
    }
    return map;
  }, [board, currentPlayer, moveCount, flipForPlayer, mustContinueFrom]);
  const forcedPieces = useMemo(() => {
    if (mustContinueFrom) {
      return [positionToIndex(mustContinueFrom, flipForPlayer)];
    }
    const moves = CakeEngine.generateLegalMoves(board, currentPlayer, moveCount);
    const captureMoves = moves.filter((m) => m.capturedSquares.length > 0);
    if (captureMoves.length === 0) return [];
    const set = new Set<number>();
    for (const move of captureMoves) {
      set.add(positionToIndex(move.from, flipForPlayer));
    }
    return Array.from(set);
  }, [board, currentPlayer, moveCount, flipForPlayer, mustContinueFrom]);

  const evaluateEndgameCountdown = useCallback(
    (nextBoard: BoardState, movePlayer: PlayerColor) => {
      const whitePieces = nextBoard.getPiecesByColor(PlayerColor.WHITE);
      const blackPieces = nextBoard.getPiecesByColor(PlayerColor.BLACK);

      const whiteKings = whitePieces.filter((p) => p.isKing()).length;
      const blackKings = blackPieces.filter((p) => p.isKing()).length;

      const whiteOnlyKing = whitePieces.length === 1 && whiteKings === 1;
      const blackOnlyKing = blackPieces.length === 1 && blackKings === 1;

      const whiteThreeKings = whitePieces.length === 3 && whiteKings === 3;
      const blackThreeKings = blackPieces.length === 3 && blackKings === 3;

      let favored: PlayerColor | null = null;
      if (whiteOnlyKing && blackThreeKings) favored = PlayerColor.BLACK;
      if (blackOnlyKing && whiteThreeKings) favored = PlayerColor.WHITE;

      if (!favored) {
        setEndgameCountdown(null);
        return;
      }

      setEndgameCountdown((prev) => {
        const next = prev ?? { favored, remaining: 12 };
        if (next.favored !== favored) {
          return { favored, remaining: 12 };
        }
        if (movePlayer === favored) {
          const remaining = Math.max(0, next.remaining - 1);
          if (remaining === 0) {
            setResult({ winner: Winner.DRAW });
          }
          return { favored, remaining };
        }
        return next;
      });
    },
    [],
  );

  const applyMove = useCallback(
    (move: Move) => {
      if (moveAudioRef.current) {
        moveAudioRef.current.currentTime = 0;
        moveAudioRef.current.play().catch(() => {});
      }
      const nextBoard = CakeEngine.applyMove(board, move);
      const nextPlayer = getOpponent(currentPlayer);
      const movedPiece = nextBoard.getPieceAt(move.to);
      const canContinueCapture =
        move.capturedSquares.length > 0 &&
        !move.isPromotion &&
        movedPiece &&
        new CaptureFindingService().findCapturesForPiece(
          nextBoard,
          movedPiece,
        ).length > 0;

      setBoard(nextBoard);
      setMoves((prev) => [...prev, move]);
      setMoveCount((prev) => prev + 1);
      if (canContinueCapture) {
        setMustContinueFrom(move.to);
        setCurrentPlayer(currentPlayer);
      } else {
        setMustContinueFrom(null);
        setCurrentPlayer(nextPlayer);
      }
      evaluateEndgameCountdown(nextBoard, move.player);

      if (!canContinueCapture) {
        const gameResult = CakeEngine.evaluateGameResult(
          nextBoard,
          nextPlayer,
        );
        if (gameResult) {
          setResult({ winner: gameResult.winner });
        }
      }
    },
    [board, currentPlayer, evaluateEndgameCountdown],
  );

  const makeMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (result) return;
      if (currentPlayer !== playerColor) return;

      const from = indexToPosition(fromIndex, flipForPlayer);
      const to = indexToPosition(toIndex, flipForPlayer);
      if (!from || !to) return;

      const legalMoves = CakeEngine.generateLegalMoves(
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

      if (!match) return;
      if (mustContinueFrom && !match.from.equals(mustContinueFrom)) return;
      if (match.capturedSquares.length > 0) {
        const piece = board.getPieceAt(from);
        if (piece) {
          const captureService = new CaptureFindingService();
          const captures = captureService.findCapturesForPiece(board, piece);
          const captureMatch = captures.find(
            (capture) => capture.from.equals(from) && capture.to.equals(to),
          );
          if (captureMatch) {
            const capturedSquares = captureMatch.capturedSquares;
            const notation = Move.generateNotation(from, to, capturedSquares);
            const rebuilt = new Move(
              match.id,
              match.gameId,
              match.moveNumber,
              match.player,
              match.from,
              match.to,
              capturedSquares,
              captureMatch.isPromotion,
              notation,
              match.createdAt,
            );
            applyMove(rebuilt);
            return;
          }

          // Fallback: for flying king single-capture, keep only the jumped piece
          const fromCoords = from.toRowCol();
          const toCoords = to.toRowCol();
          const rowStep = Math.sign(toCoords.row - fromCoords.row);
          const colStep = Math.sign(toCoords.col - fromCoords.col);
          if (rowStep !== 0 && colStep !== 0) {
            const jumped: Position[] = [];
            let r = fromCoords.row + rowStep;
            let c = fromCoords.col + colStep;
            while (r !== toCoords.row && c !== toCoords.col) {
              const pos = Position.fromRowCol(r, c);
              const occupant = board.getPieceAt(pos);
              if (occupant && occupant.color !== piece.color) {
                jumped.push(pos);
              }
              r += rowStep;
              c += colStep;
            }
            if (jumped.length === 1) {
              const notation = Move.generateNotation(from, to, jumped);
              const rebuilt = new Move(
                match.id,
                match.gameId,
                match.moveNumber,
                match.player,
                match.from,
                match.to,
                jumped,
                match.isPromotion,
                notation,
                match.createdAt,
              );
              applyMove(rebuilt);
              return;
            }
          }
        }
      }
      applyMove(match);
    },
    [applyMove, board, currentPlayer, moveCount, playerColor, result, mustContinueFrom],
  );

  const reset = useCallback(() => {
    initialBoardRef.current = CakeEngine.createInitialState();
    setBoard(initialBoardRef.current);
    setCurrentPlayer(PlayerColor.WHITE);
    setMoveCount(0);
    setMoves([]);
    setResult(null);
    setIsAiThinking(false);
    setTimeLeft({ WHITE: timeSeconds, BLACK: timeSeconds });
    setEndgameCountdown(null);
    setMustContinueFrom(null);
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
    for (const move of newMoves) {
      nextBoard = CakeEngine.applyMove(nextBoard, move);
    }

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
    setMustContinueFrom(null);
  }, [moves, playerColor]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const moveAudio = new Audio("/sfx/move1.mp3");
    moveAudio.preload = "auto";
    moveAudio.volume = 0.4;
    moveAudioRef.current = moveAudio;

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
      startAudio.currentTime = 0;
      startAudio.play().catch(() => {});
      startedRef.current = true;
    }
    return () => {
      moveAudioRef.current = null;
      startAudioRef.current = null;
      warningAudioRef.current = null;
      victoryAudioRef.current = null;
    };
  }, [loaded]);

  useEffect(() => {
    const winner = result?.winner ?? null;
    if (!winner || winner === prevResultRef.current) return;
    prevResultRef.current = winner;
    if (victoryAudioRef.current) {
      victoryAudioRef.current.currentTime = 0;
      victoryAudioRef.current.play().catch(() => {});
    }
  }, [result]);

  const playWarning = useCallback(() => {
    if (!warningAudioRef.current) return;
    warningAudioRef.current.currentTime = 0;
    warningAudioRef.current.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (aiTimeoutRef.current !== null) {
      window.clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    if (result) return;
    if (currentPlayer === playerColor) return;

    setIsAiThinking(true);
    aiTimeoutRef.current = window.setTimeout(() => {
      const aiMove = getBestMove(board, currentPlayer, aiLevel);
      if (aiMove) {
        applyMove(aiMove);
      } else {
        const gameResult = CakeEngine.evaluateGameResult(board, currentPlayer);
        if (gameResult) {
          setResult({ winner: gameResult.winner });
        }
      }
      setIsAiThinking(false);
      aiTimeoutRef.current = null;
    }, 350);

    return () => {
      if (aiTimeoutRef.current !== null) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, [aiLevel, applyMove, board, currentPlayer, playerColor, result]);

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
        const whitePieces = board.getPiecesByColor(PlayerColor.WHITE).length;
        const blackPieces = board.getPiecesByColor(PlayerColor.BLACK).length;
        const isThreeVsOne =
          (whitePieces === 3 && blackPieces === 1) ||
          (whitePieces === 1 && blackPieces === 3);
        if (next.WHITE === 0) {
          setResult({ winner: isThreeVsOne ? Winner.DRAW : Winner.BLACK });
        } else if (next.BLACK === 0) {
          setResult({ winner: isThreeVsOne ? Winner.DRAW : Winner.WHITE });
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [board, currentPlayer, result, timeSeconds]);
  useEffect(() => {
    saveGame(
      {
        board,
        currentPlayer,
        moveCount,
        moves,
        result,
        timeLeft,
        endgameCountdown,
        mustContinueFrom,
      },
      aiLevel,
      playerColor,
    );
  }, [
    board,
    currentPlayer,
    moveCount,
    moves,
    result,
    timeLeft,
    endgameCountdown,
    mustContinueFrom,
    aiLevel,
    playerColor,
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
    } as LocalGameState,
    pieces,
    legalMoves,
    forcedPieces,
    playWarning,
    undo,
    resign,
    makeMove,
    reset,
  };
};
