import { BoardState, PlayerColor } from "@tzdraft/mkaguzi-engine";

/**
 * Endgame countdown state for Art. 9 rules.
 */
export interface EndgameCountdown {
  favored: PlayerColor | null;
  remaining: number;
}

/** PDN 1-32 long diagonal squares (diagonal from PDN 4 to PDN 29) */
export const LONG_DIAGONAL_PDNS = [4, 8, 11, 15, 18, 22, 25, 29];

/**
 * Checks if a square (PDN 1-32) is on the main long diagonal.
 */
export function isOnLongDiagonal(pdn: number): boolean {
  return LONG_DIAGONAL_PDNS.includes(pdn);
}

/**
 * Art. 9 — Endgame Draw Countdown Rules.
 * Evaluates the board state and returns a draw reason if the limit is reached,
 * otherwise returns null and updates the countdown object.
 *
 * @param nextBoard The board after the move
 * @param movePlayer The player who just moved
 * @param hadCapture Whether the move involved a capture
 * @param currentCountdown The current active countdown (if any)
 * @param thirtyMoveCount Current count of non-capture king moves (Art. 9.3)
 * @returns { reason: string | null, nextCountdown: EndgameCountdown | null, nextThirtyCount: number }
 */
export function evaluateEndgameCountdown(
  nextBoard: BoardState,
  movePlayer: PlayerColor,
  hadCapture: boolean,
  currentCountdown: EndgameCountdown | null,
  thirtyMoveCount: number,
): {
  reason: string | null;
  nextCountdown: EndgameCountdown | null;
  nextThirtyCount: number;
} {
  const wp = nextBoard.getPiecesByColor(PlayerColor.WHITE);
  const bp = nextBoard.getPiecesByColor(PlayerColor.BLACK);
  const wk = wp.filter((p) => p.isKing()).length;
  const bk = bp.filter((p) => p.isKing()).length;
  const wm = wp.length - wk;
  const bm = bp.length - bk;

  // Art. 9.3 — 30 full moves (60 half-moves) with kings only, no captures
  const allKings = wm === 0 && bm === 0 && (wk > 0 || bk > 0);
  let nextThirtyCount = thirtyMoveCount;
  if (!allKings || hadCapture) {
    nextThirtyCount = 0;
  } else {
    nextThirtyCount += 1;
  }

  // Classify specific endgame scenarios with distinct limits (9.4, 9.5)
  const whiteLoneKing = wp.length === 1 && wk === 1;
  const blackLoneKing = bp.length === 1 && bk === 1;
  const whiteTwoKings = wp.length === 2 && wk === 2;
  const blackTwoKings = bp.length === 2 && bk === 2;
  const whiteKingMan  = wp.length === 2 && wk === 1 && wm === 1;
  const blackKingMan  = bp.length === 2 && bk === 1 && bm === 1;
  const whiteThreePlusKings = wk >= 3 && wm === 0;
  const blackThreePlusKings = bk >= 3 && bm === 0;

  let favored: PlayerColor | null = null;
  let limit = 0;

  if (whiteLoneKing && blackThreePlusKings) { favored = PlayerColor.BLACK; limit = 12; }
  else if (blackLoneKing && whiteThreePlusKings) { favored = PlayerColor.WHITE; limit = 12; }
  else if (whiteLoneKing && blackTwoKings) { favored = PlayerColor.BLACK; limit = 5; }
  else if (blackLoneKing && whiteTwoKings) { favored = PlayerColor.WHITE; limit = 5; }
  else if (whiteLoneKing && blackKingMan) { favored = PlayerColor.BLACK; limit = 5; }
  else if (blackLoneKing && whiteKingMan) { favored = PlayerColor.WHITE; limit = 5; }

  // Detect and return final results
  if (nextThirtyCount >= 60) {
    return { reason: "30-move", nextCountdown: null, nextThirtyCount };
  }

  if (limit > 0) {
    const isNewScenario = !currentCountdown || currentCountdown.favored !== favored;
    const base = isNewScenario ? limit : currentCountdown.remaining;
    const shouldDecrement = limit === 12 ? movePlayer === favored : movePlayer !== favored;
    
    let nextCountdownState: EndgameCountdown;
    if (isNewScenario) {
      // Art. 9 "Stating of an event": The move that establishes the situation 
      // (the event) triggers the countdown initialization but is not itself counted.
      nextCountdownState = { favored, remaining: limit };
    } else {
      nextCountdownState = shouldDecrement
        ? { favored, remaining: Math.max(0, currentCountdown!.remaining - 1) }
        : currentCountdown!;
    }

    if (nextCountdownState.remaining === 0) {
      return {
        reason: limit === 12 ? "three-kings" : "endgame",
        nextCountdown: null,
        nextThirtyCount: 0,
      };
    }
    return { reason: null, nextCountdown: nextCountdownState, nextThirtyCount };
  }

  // Art. 8.1 / 10.2 — Immediate Draw by Insufficient Material (1 King vs 1 King)
  const is1v1 = whiteLoneKing && blackLoneKing;
  if (is1v1) {
    return { reason: "insufficient-material", nextCountdown: null, nextThirtyCount: 0 };
  }

  // If none of the specific 5/12 move limits apply, but it's kings-only, 
  // show the 30-move draw countdown (when it gets closer, e.g. last 10 moves).
  if (allKings && nextThirtyCount >= 40) {
    const remainingHalfMoves = 60 - nextThirtyCount;
    const remainingFullMoves = Math.ceil(remainingHalfMoves / 2);
    return {
      reason: null,
      nextCountdown: { favored: null, remaining: remainingFullMoves },
      nextThirtyCount,
    };
  }

  return { reason: null, nextCountdown: null, nextThirtyCount };
}

/**
 * Art. 10 — Timeout result adjudication.
 * Returns the correct winner given that `timedOutPlayer` ran out of clock.
 */
export function computeTimeoutResult(
  board: BoardState,
  timedOutPlayer: PlayerColor,
  endgameCountdown: EndgameCountdown | null,
): "WHITE" | "BLACK" | "DRAW" {
  const opponent =
    timedOutPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
  const opponentWinner = opponent === PlayerColor.WHITE ? "WHITE" : "BLACK";

  const wp = board.getPiecesByColor(PlayerColor.WHITE);
  const bp = board.getPiecesByColor(PlayerColor.BLACK);
  const wk = wp.filter((p) => p.isKing()).length;
  const bk = bp.filter((p) => p.isKing()).length;
  const wm = wp.length - wk;
  const bm = bp.length - bk;

  // Art. 10.2: K vs K → draw
  if (wk === 1 && wm === 0 && bk === 1 && bm === 0) return "DRAW";

  // Art. 10.3: stronger side timed out → draw
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
    return "DRAW";
  }

  // Art. 10.4: weaker side (lone king) timed out in 2K/K+M vs 1K
  const timedOutPieces = timedWhite ? wp : bp;
  const opponentPieces = timedWhite ? bp : wp;
  const timedOutIsLoneKing =
    timedOutPieces.length === 1 &&
    timedOutPieces[0].isKing() &&
    opponentPieces.length === 2;

  if (timedOutIsLoneKing) {
    const loneKingPdn = timedOutPieces[0].position.value;
    if (isOnLongDiagonal(loneKingPdn)) return "DRAW";

    // 5 moves survived → draw (remaining starts at 5 and decrements on each weak-side move)
    const weakMovesMade =
      endgameCountdown != null ? Math.max(0, 5 - endgameCountdown.remaining) : 0;
    if (weakMovesMade >= 5) return "DRAW";
  }

  return opponentWinner;
}

/**
 * Maps internal endgame reasons to localized labels using Article 8/10 terminology.
 */
export function getEndgameReasonLabel(
  reason: string,
  isWin: boolean,
  isDraw: boolean,
  t: any,
) {
  // If t is not provided or not a function, fallback to raw strings or reason
  const translate = typeof t === "function" ? t : (k: string, d?: string) => d || k;

  if (isDraw) {
    if (reason === "agreement") return translate("gameArena.gameOver.reasons.agreement");
    if (reason === "stalemate") return translate("gameArena.gameOver.reasons.stalemate");
    if (reason === "repetition") return translate("gameArena.gameOver.reasons.repetition");
    if (reason === "30-move") return translate("gameArena.gameOver.reasons.rule30");
    if (reason === "three-kings") return translate("gameArena.gameOver.reasons.rule12");
    if (reason === "endgame") return translate("gameArena.gameOver.reasons.rule5");
    if (reason === "insufficient-material") return translate("gameArena.gameOver.reasons.insufficientMaterial", "Insufficient Material");
    if (reason === "timeout-draw") return translate("gameArena.gameOver.reasons.timeoutDraw");
    return translate("freePlay.result.draw", "Draw");
  }

  if (reason === "resign") return translate("gameArena.gameOver.reasons.resign");
  if (reason === "time") return translate("gameArena.gameOver.reasons.time");

  // Fallback for general win/loss with no specific reason
  return isWin ? translate("gameArena.gameOver.youWon", "Victory") : translate("gameArena.gameOver.youLost", "Defeat");
}
