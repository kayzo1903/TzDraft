import { useCallback, useRef, useState, useEffect } from "react";
import { BoardState, PlayerColor, Position } from "@tzdraft/mkaguzi-engine";
import { useMkaguzi } from "../lib/game/mkaguzi-mobile";
import type { RawMove } from "../lib/game/bridge-types";

const INITIAL_FEN = "W:W1,2,3,4,5,6,7,8,9,10,11,12:B21,22,23,24,25,26,27,28,29,30,31,32";

export interface FreeMoveRecord {
  from: number;
  to: number;
  notation: string;
  player: "WHITE" | "BLACK";
  captureCount: number;
}

export interface FreeGameResult {
  winner: "WHITE" | "BLACK" | "DRAW";
  reason: string;
}

export interface FreeGameState {
  fen: string;
  board: BoardState;
  currentPlayer: PlayerColor;
  legalMoves: RawMove[];
  selectedSquare: number | null;
  validDestinations: number[];
  capturablePieces: number[];
  lastMove: { from: number; to: number } | null;
  moveHistory: FreeMoveRecord[];
  flipBoard: boolean;
  isReady: boolean;
  invalidMoveSignal: number;
  fenHistory: string[];
  result: FreeGameResult | null;
  moveCount: number;
}

export function useFreeGame() {
  const bridge = useMkaguzi();

  const [fen, setFen] = useState(INITIAL_FEN);
  const [board, setBoard] = useState(() => BoardState.fromFen(INITIAL_FEN));
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>(PlayerColor.WHITE);
  const [legalMoves, setLegalMoves] = useState<RawMove[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [validDestinations, setValidDestinations] = useState<number[]>([]);
  const [capturablePieces, setCapturablePieces] = useState<number[]>([]);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const [moveHistory, setMoveHistory] = useState<FreeMoveRecord[]>([]);
  const [flipBoard, setFlipBoard] = useState(false);
  const [invalidMoveSignal, setInvalidMoveSignal] = useState(0);
  const [resetCount, setResetCount] = useState(0);
  const [result, setResult] = useState<FreeGameResult | null>(null);

  const fenHistory = useRef<string[]>([INITIAL_FEN]);

  const computeCapturables = useCallback((moves: RawMove[]): number[] => {
    const caps = new Set<number>();
    for (const m of moves) for (const c of m.captures) caps.add(c);
    return Array.from(caps);
  }, []);

  const buildNotation = (move: RawMove): string => {
    if (move.captures.length > 0) {
      return [move.from, ...move.captures, move.to].join("×");
    }
    return `${move.from}-${move.to}`;
  };

  useEffect(() => {
    if (!bridge.isReady) return;
    let cancelled = false;
    bridge.generateMoves(INITIAL_FEN).then((moves) => {
      if (cancelled) return;
      setLegalMoves(moves);
      setCapturablePieces(computeCapturables(moves));
    });
    return () => { cancelled = true; };
  }, [bridge.isReady, resetCount, computeCapturables]);

  const performMove = useCallback(
    async (move: RawMove) => {
      const newFen = await bridge.applyMove(fen, move.from, move.to);
      if (!newFen) return;

      const nextPlayer =
        currentPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
      const nextMoves = await bridge.generateMoves(newFen);

      const newRecord: FreeMoveRecord = {
        from: move.from,
        to: move.to,
        notation: buildNotation(move),
        player: currentPlayer === PlayerColor.WHITE ? "WHITE" : "BLACK",
        captureCount: move.captures.length,
      };

      setFen(newFen);
      setBoard(BoardState.fromFen(newFen));
      setCurrentPlayer(nextPlayer);
      setLegalMoves(nextMoves);
      setLastMove({ from: move.from, to: move.to });
      setMoveHistory((prev) => [...prev, newRecord]);
      fenHistory.current.push(newFen);
      setSelectedSquare(null);
      setValidDestinations([]);
      setCapturablePieces(computeCapturables(nextMoves));

      // Game-over detection: no legal moves for the next player = they lose
      if (nextMoves.length === 0) {
        const winner = currentPlayer === PlayerColor.WHITE ? "WHITE" : "BLACK";
        setResult({ winner, reason: "stalemate" });
      }
    },
    [bridge, fen, currentPlayer, computeCapturables]
  );

  const selectSquare = useCallback(
    (pdn: number) => {
      // Prevent input after game is over or for out-of-range squares (e.g. -1 from onInvalidPress)
      if (result !== null) return;
      if (pdn < 1 || pdn > 32) {
        setSelectedSquare(null);
        setValidDestinations([]);
        return;
      }

      // 1. Try selecting own piece
      const piece = board.getPieceAt(new Position(pdn));
      if (piece && piece.color === currentPlayer) {
        const ownMoves = legalMoves.filter((m) => m.from === pdn);
        if (ownMoves.length > 0) {
          setSelectedSquare(pdn);
          setValidDestinations(ownMoves.map((m) => m.to));
          return;
        }
      }

      // 2. Execute move if destination selected
      if (selectedSquare !== null && validDestinations.includes(pdn)) {
        const move = legalMoves.find((m) => m.from === selectedSquare && m.to === pdn);
        if (move) {
          setSelectedSquare(null);
          setValidDestinations([]);
          performMove(move).catch(console.error);
          return;
        }
      }

      // 3. Clear selection or signal invalid tap
      if (piece || selectedSquare != null) {
        setInvalidMoveSignal((s) => s + 1);
      }
      setSelectedSquare(null);
      setValidDestinations([]);
    },
    [board, currentPlayer, legalMoves, selectedSquare, validDestinations, performMove, result]
  );

  const toggleFlip = useCallback(() => setFlipBoard((prev) => !prev), []);

  const reset = useCallback(() => {
    setFen(INITIAL_FEN);
    setBoard(BoardState.fromFen(INITIAL_FEN));
    setCurrentPlayer(PlayerColor.WHITE);
    setLegalMoves([]);
    setSelectedSquare(null);
    setValidDestinations([]);
    setCapturablePieces([]);
    setLastMove(null);
    setMoveHistory([]);
    setResult(null);
    fenHistory.current = [INITIAL_FEN];
    setResetCount((n) => n + 1);
  }, []);

  const undo = useCallback(async () => {
    if (fenHistory.current.length <= 1) return;

    const newFenHistory = fenHistory.current.slice(0, -1);
    const prevFen = newFenHistory[newFenHistory.length - 1];
    const prevMoves = await bridge.generateMoves(prevFen);

    fenHistory.current = newFenHistory;
    setFen(prevFen);
    setBoard(BoardState.fromFen(prevFen));
    setCurrentPlayer((prev) => (prev === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE));
    setLegalMoves(prevMoves);
    setMoveHistory((prev) => prev.slice(0, -1));
    setLastMove(null);
    setSelectedSquare(null);
    setValidDestinations([]);
    setCapturablePieces(computeCapturables(prevMoves));
    // Undoing past a game-over position clears the result
    setResult(null);
  }, [bridge, computeCapturables]);

  return {
    fen,
    board,
    currentPlayer,
    legalMoves,
    selectedSquare,
    validDestinations,
    capturablePieces,
    lastMove,
    moveHistory,
    moveCount: moveHistory.length,
    flipBoard,
    toggleFlip,
    selectSquare,
    reset,
    undo,
    isAiThinking: false,
    result,
    isReady: bridge.isReady,
    invalidMoveSignal,
    fenHistory: fenHistory.current,
  };
}
