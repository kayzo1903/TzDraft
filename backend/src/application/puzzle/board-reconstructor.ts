/**
 * board-reconstructor.ts
 *
 * Replays the move history of a completed game and returns the board state
 * (as a PieceSnapshot array) before each move, plus a final state after all
 * moves.
 *
 * Uses the same PieceSnapshot format as Game.boardSnapshot so the states can
 * be fed directly into MkaguziAdapter.analyze() and stored as Puzzle.pieces.
 */

export interface PieceSnapshot {
  type: 'MAN' | 'KING';
  color: 'WHITE' | 'BLACK';
  position: number; // 1-32 dark squares
}

export interface MoveRecord {
  fromSquare: number;
  toSquare: number;
  capturedSquares: number[];
  isPromotion: boolean;
  player: 'WHITE' | 'BLACK';
}

/** Standard TZD opening position: 12 white men top, 12 black men bottom. */
const INITIAL_POSITION: PieceSnapshot[] = [
  ...Array.from({ length: 12 }, (_, i): PieceSnapshot => ({
    type: 'MAN',
    color: 'WHITE',
    position: i + 1,
  })),
  ...Array.from({ length: 12 }, (_, i): PieceSnapshot => ({
    type: 'MAN',
    color: 'BLACK',
    position: i + 21,
  })),
];

/**
 * Applies a single move to a board state and returns the new state.
 * Captured pieces are removed immediately (TZD uses early removal for
 * chain captures). The moved piece is promoted if isPromotion is true.
 */
export function applyMove(board: PieceSnapshot[], move: MoveRecord): PieceSnapshot[] {
  // Remove captured pieces
  let next = board.filter((p) => !move.capturedSquares.includes(p.position));

  // Move the piece
  const piece = next.find((p) => p.position === move.fromSquare);
  if (!piece) return next; // should never happen in valid game data

  next = next.map((p) =>
    p.position === move.fromSquare
      ? { ...p, position: move.toSquare, type: move.isPromotion ? 'KING' : p.type }
      : p,
  );

  return next;
}

/**
 * Replays all moves from the initial position.
 *
 * Returns an array of board states where:
 *   states[0]  = position BEFORE move 0 (the initial position)
 *   states[i]  = position BEFORE move i
 *   states[n]  = position AFTER the last move (final board)
 *
 * Length = moves.length + 1
 */
export function replayGame(moves: MoveRecord[]): PieceSnapshot[][] {
  const states: PieceSnapshot[][] = [structuredClone(INITIAL_POSITION)];

  for (const move of moves) {
    const current = states[states.length - 1];
    states.push(applyMove(current, move));
  }

  return states;
}
