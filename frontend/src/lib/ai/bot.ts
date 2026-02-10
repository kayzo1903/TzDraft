import {
  BoardState,
  CakeEngine,
  Move,
  PieceType,
  PlayerColor,
} from "@tzdraft/cake-engine";

const getOpponent = (player: PlayerColor): PlayerColor =>
  player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;

const evaluateBoard = (board: BoardState, player: PlayerColor): number => {
  const pieces = board.getAllPieces();
  let score = 0;

  for (const piece of pieces) {
    const value = piece.type === PieceType.KING ? 3 : 1;
    score += piece.color === player ? value : -value;
  }

  return score;
};

const getDepthForLevel = (level: number): number => {
  if (level <= 2) return 0;
  if (level === 3) return 2;
  if (level === 4) return 3;
  if (level === 5) return 4;
  if (level >= 6) return 4;
  return 2;
};

const minimax = (
  board: BoardState,
  currentPlayer: PlayerColor,
  maximizingPlayer: PlayerColor,
  depth: number,
  alpha: number,
  beta: number,
): number => {
  if (depth === 0) {
    return evaluateBoard(board, maximizingPlayer);
  }

  const moves = CakeEngine.generateLegalMoves(board, currentPlayer);
  if (moves.length === 0) {
    return evaluateBoard(board, maximizingPlayer);
  }

  const isMaximizing = currentPlayer === maximizingPlayer;
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let nextAlpha = alpha;
  let nextBeta = beta;

  for (const move of moves) {
    const nextBoard = CakeEngine.applyMove(board, move);
    const score = minimax(
      nextBoard,
      getOpponent(currentPlayer),
      maximizingPlayer,
      depth - 1,
      nextAlpha,
      nextBeta,
    );

    if (isMaximizing) {
      bestScore = Math.max(bestScore, score);
      nextAlpha = Math.max(nextAlpha, bestScore);
    } else {
      bestScore = Math.min(bestScore, score);
      nextBeta = Math.min(nextBeta, bestScore);
    }

    if (nextBeta <= nextAlpha) {
      break;
    }
  }

  return bestScore;
};

export const getBestMove = (
  board: BoardState,
  player: PlayerColor,
  level: number,
): Move | null => {
  const moves = CakeEngine.generateLegalMoves(board, player);
  if (moves.length === 0) return null;

  const depth = getDepthForLevel(level);
  if (depth === 0) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMoves: Move[] = [];
  let bestScore = -Infinity;

  for (const move of moves) {
    const nextBoard = CakeEngine.applyMove(board, move);
    const score = minimax(
      nextBoard,
      getOpponent(player),
      player,
      depth - 1,
      -Infinity,
      Infinity,
    );

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};
