import { useCallback, useRef, useState, useEffect } from "react";
import { BoardState, PlayerColor, Position } from "@tzdraft/mkaguzi-engine";
import { useMkaguzi } from "../lib/game/mkaguzi-mobile";
import type { RawMove } from "../lib/game/bridge-types";

const INITIAL_FEN = "W:W1,2,3,4,5,6,7,8,9,10,11,12:B21,22,23,24,25,26,27,28,29,30,31,32";

export interface LocalPvpConfig {
  /** Show pass-device overlay between turns */
  passDevice: boolean;
  /** Total minutes per player (0 = no time limit) */
  timeMinutes: number;
  /** Which color does Player 1 play? */
  player1Color: "WHITE" | "BLACK";
  /** Disable auto-flip — board stays in fixed orientation */
  noFlip: boolean;
}

export interface LocalMoveRecord {
  from: number;
  to: number;
  notation: string;
  player: "WHITE" | "BLACK";
  captureCount: number;
}

export interface LocalGameResult {
  winner: "WHITE" | "BLACK" | "DRAW";
  reason: "stalemate" | "time" | "resign" | "agreement";
}

export interface LocalPvpGameState {
  fen: string;
  board: BoardState;
  currentPlayer: PlayerColor;
  legalMoves: RawMove[];
  selectedSquare: number | null;
  validDestinations: number[];
  capturablePieces: number[];
  lastMove: { from: number; to: number } | null;
  moveHistory: LocalMoveRecord[];
  moveCount: number;
  flipBoard: boolean;
  isReady: boolean;
  invalidMoveSignal: number;
  fenHistory: string[];
  result: LocalGameResult | null;
  /** Pass-device handoff overlay is active */
  awaitingHandoff: boolean;
  /** Name of the player whose turn it is (after the handoff) */
  handoffPlayerName: string;
  /** Per-player time remaining in seconds — display as MM:SS (only valid when timeMinutes > 0) */
  timeLeft: { WHITE: number; BLACK: number };
}

export function useLocalPvpGame(config: LocalPvpConfig) {
  const { passDevice, timeMinutes, player1Color, noFlip } = config;
  const bridge = useMkaguzi();

  const player2Color: "WHITE" | "BLACK" = player1Color === "WHITE" ? "BLACK" : "WHITE";
  const player1Name = `Player 1`;
  const player2Name = `Player 2`;

  const playerName = (color: "WHITE" | "BLACK") =>
    color === player1Color ? player1Name : player2Name;

  // ── Core game state ────────────────────────────────────────────────────────
  const [fen, setFen] = useState(INITIAL_FEN);
  const [board, setBoard] = useState(() => BoardState.fromFen(INITIAL_FEN));
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>(PlayerColor.WHITE);
  const [legalMoves, setLegalMoves] = useState<RawMove[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [validDestinations, setValidDestinations] = useState<number[]>([]);
  const [capturablePieces, setCapturablePieces] = useState<number[]>([]);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const [moveHistory, setMoveHistory] = useState<LocalMoveRecord[]>([]);
  const [invalidMoveSignal, setInvalidMoveSignal] = useState(0);
  const [resetCount, setResetCount] = useState(0);
  const [result, setResult] = useState<LocalGameResult | null>(null);

  // ── Pass-device overlay ────────────────────────────────────────────────────
  // On first load we show the overlay so Player 1 sees "Your turn" before any moves
  const [awaitingHandoff, setAwaitingHandoff] = useState(passDevice);
  const [handoffPlayerName, setHandoffPlayerName] = useState(playerName(player1Color === "WHITE" ? "WHITE" : "BLACK"));

  // ── Timers (second-granularity, initialised from minutes) ─────────────────
  // timeLeft stores seconds remaining per player so the display can show MM:SS.
  const [timeLeft, setTimeLeft] = useState({
    WHITE: timeMinutes * 60,
    BLACK: timeMinutes * 60,
  });
  // Stop timer ticking when overlay is up or game is over
  const timerActive = timeMinutes > 0 && !awaitingHandoff && result === null;

  const currentPlayerStr = currentPlayer === PlayerColor.WHITE ? "WHITE" : "BLACK";

  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev[currentPlayerStr] - 1;
        if (next <= 0) {
          clearInterval(id);
          const loser = currentPlayerStr;
          const winner = loser === "WHITE" ? "BLACK" : "WHITE";
          setResult({ winner, reason: "time" });
          return { ...prev, [currentPlayerStr]: 0 };
        }
        return { ...prev, [currentPlayerStr]: next };
      });
    }, 1000); // tick every second for MM:SS display
    return () => clearInterval(id);
  }, [timerActive, currentPlayerStr]);

  // ── FEN history ────────────────────────────────────────────────────────────
  const fenHistory = useRef<string[]>([INITIAL_FEN]);

  // ── Helpers ────────────────────────────────────────────────────────────────
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

  // ── Initial move generation ────────────────────────────────────────────────
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

  // ── Move execution ─────────────────────────────────────────────────────────
  const performMove = useCallback(
    async (move: RawMove) => {
      const newFen = await bridge.applyMove(fen, move.from, move.to);
      if (!newFen) return;

      const prevPlayerStr = currentPlayer === PlayerColor.WHITE ? "WHITE" : "BLACK";
      const nextPlayerColor = currentPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
      const nextPlayerStr = nextPlayerColor === PlayerColor.WHITE ? "WHITE" : "BLACK";
      const nextMoves = await bridge.generateMoves(newFen);

      const newRecord: LocalMoveRecord = {
        from: move.from,
        to: move.to,
        notation: buildNotation(move),
        player: prevPlayerStr,
        captureCount: move.captures.length,
      };

      setFen(newFen);
      setBoard(BoardState.fromFen(newFen));
      setCurrentPlayer(nextPlayerColor);
      setLegalMoves(nextMoves);
      setLastMove({ from: move.from, to: move.to });
      setMoveHistory((prev) => [...prev, newRecord]);
      fenHistory.current.push(newFen);
      setSelectedSquare(null);
      setValidDestinations([]);
      setCapturablePieces(computeCapturables(nextMoves));

      // Game over: no legal moves
      if (nextMoves.length === 0) {
        setResult({ winner: prevPlayerStr, reason: "stalemate" });
        return;
      }

      // Pass-device handoff
      if (passDevice) {
        setHandoffPlayerName(playerName(nextPlayerStr));
        setAwaitingHandoff(true);
      }
    },
    [bridge, fen, currentPlayer, computeCapturables, passDevice, player1Color]
  );

  // ── Square selection / move input ──────────────────────────────────────────
  const selectSquare = useCallback(
    (pdn: number) => {
      if (result !== null || awaitingHandoff) return;
      if (pdn < 1 || pdn > 32) {
        setSelectedSquare(null);
        setValidDestinations([]);
        return;
      }

      const piece = board.getPieceAt(new Position(pdn));
      if (piece && piece.color === currentPlayer) {
        const ownMoves = legalMoves.filter((m) => m.from === pdn);
        if (ownMoves.length > 0) {
          setSelectedSquare(pdn);
          setValidDestinations(ownMoves.map((m) => m.to));
          return;
        }
      }

      if (selectedSquare !== null && validDestinations.includes(pdn)) {
        const move = legalMoves.find((m) => m.from === selectedSquare && m.to === pdn);
        if (move) {
          setSelectedSquare(null);
          setValidDestinations([]);
          performMove(move).catch(console.error);
          return;
        }
      }

      if (piece || selectedSquare != null) {
        setInvalidMoveSignal((s) => s + 1);
      }
      setSelectedSquare(null);
      setValidDestinations([]);
    },
    [board, currentPlayer, legalMoves, selectedSquare, validDestinations, performMove, result, awaitingHandoff]
  );

  // ── Handoff acknowledgement ────────────────────────────────────────────────
  const acknowledgeHandoff = useCallback(() => {
    setAwaitingHandoff(false);
  }, []);

  // ── Resign ─────────────────────────────────────────────────────────────────
  const resign = useCallback(() => {
    const loser = currentPlayer === PlayerColor.WHITE ? "WHITE" : "BLACK";
    const winner: "WHITE" | "BLACK" = loser === "WHITE" ? "BLACK" : "WHITE";
    setResult({ winner, reason: "resign" });
  }, [currentPlayer]);

  // ── Accept draw (called after both players agree) ──────────────────────────
  const acceptDraw = useCallback(() => {
    setResult({ winner: "DRAW", reason: "agreement" });
  }, []);

  // ── Undo ───────────────────────────────────────────────────────────────────
  const undo = useCallback(async () => {
    if (fenHistory.current.length <= 1 || result !== null) return;
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
    setResult(null);
    // Dismiss handoff overlay if it was showing (undo takes us back to the previous player)
    setAwaitingHandoff(false);
  }, [bridge, computeCapturables, result]);

  // ── Reset ──────────────────────────────────────────────────────────────────
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
    setTimeLeft({ WHITE: timeMinutes * 60, BLACK: timeMinutes * 60 });
    if (passDevice) {
      setHandoffPlayerName(playerName(player1Color === "WHITE" ? "WHITE" : "BLACK"));
      setAwaitingHandoff(true);
    }
    setResetCount((n) => n + 1);
  }, [timeMinutes, passDevice, player1Color]);

  // ── Board flip (always show current player's side at bottom) ───────────────
  // Board is flipped when it's BLACK's turn (so BLACK pieces appear at the bottom)
  // Auto-flip so the current player's pieces are always at the bottom,
  // unless noFlip is enabled (fixed orientation).
  const flipBoard = noFlip ? false : currentPlayer === PlayerColor.BLACK;

  return {
    fen,
    board,
    currentPlayer,
    currentPlayerStr: currentPlayerStr as "WHITE" | "BLACK",
    legalMoves,
    selectedSquare,
    validDestinations,
    capturablePieces,
    lastMove,
    moveHistory,
    moveCount: moveHistory.length,
    flipBoard,
    selectSquare,
    resign,
    acceptDraw,
    undo,
    reset,
    isReady: bridge.isReady,
    invalidMoveSignal,
    fenHistory: fenHistory.current,
    result,
    awaitingHandoff,
    handoffPlayerName,
    acknowledgeHandoff,
    timeLeft,
    player1Color,
    player2Color,
    player1Name,
    player2Name,
    playerName,
  };
}
