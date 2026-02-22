import {
  BoardState,
  CakeEngine,
  CaptureFindingService,
  Move,
  PieceType,
  PlayerColor,
} from "@tzdraft/cake-engine";

const getOpponent = (player: PlayerColor): PlayerColor =>
  player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;

const MATE_SCORE = 100000;
const PIECE_VALUES = {
  [PieceType.MAN]: 100,
  [PieceType.KING]: 350,
};

const MAN_PST = [
  [0, 0, 4, 0, 0, 4, 0, 0],
  [0, 6, 0, 8, 8, 0, 6, 0],
  [4, 0, 10, 0, 0, 10, 0, 4],
  [0, 10, 0, 14, 14, 0, 10, 0],
  [6, 0, 12, 0, 0, 12, 0, 6],
  [0, 12, 0, 16, 16, 0, 12, 0],
  [8, 0, 14, 0, 0, 14, 0, 8],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KING_PST = [
  [4, 0, 6, 0, 0, 6, 0, 4],
  [0, 8, 0, 10, 10, 0, 8, 0],
  [6, 0, 12, 0, 0, 12, 0, 6],
  [0, 10, 0, 14, 14, 0, 10, 0],
  [0, 10, 0, 14, 14, 0, 10, 0],
  [6, 0, 12, 0, 0, 12, 0, 6],
  [0, 8, 0, 10, 10, 0, 8, 0],
  [4, 0, 6, 0, 0, 6, 0, 4],
];

const captureService = new CaptureFindingService();

const boardKey = (
  board: BoardState,
  currentPlayer: PlayerColor,
  maximizingPlayer: PlayerColor,
): string => {
  const pieces = board
    .getAllPieces()
    .sort((a, b) => a.position.value - b.position.value)
    .map(
      (p) => `${p.position.value}${p.color[0]}${p.type === PieceType.KING ? "K" : "M"}`,
    )
    .join("");
  return `${currentPlayer}|${maximizingPlayer}|${pieces}`;
};

const evaluateBoard = (board: BoardState, player: PlayerColor): number => {
  const pieces = board.getAllPieces();
  const opponent = getOpponent(player);
  let score = 0;

  // Material + king weight
  for (const piece of pieces) {
    const value = PIECE_VALUES[piece.type];
    score += piece.color === player ? value : -value;

    // Center control bonus
    const { row, col } = piece.position.toRowCol();
    const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    const centerBonus = (3.5 - centerDist) * 2;
    score += piece.color === player ? centerBonus : -centerBonus;

    // Man advancement bonus
    if (piece.type === PieceType.MAN) {
      const advance = piece.color === PlayerColor.WHITE ? row : 7 - row;
      const advanceBonus = advance * 3;
      score += piece.color === player ? advanceBonus : -advanceBonus;
    }

    const rowForPst =
      piece.color === PlayerColor.WHITE ? row : 7 - row;
    const pstValue =
      piece.type === PieceType.KING
        ? KING_PST[rowForPst][col]
        : MAN_PST[rowForPst][col];
    score += piece.color === player ? pstValue : -pstValue;

    // Back-row guard bonus for men
    if (piece.type === PieceType.MAN) {
      const isBackRow =
        (piece.color === PlayerColor.WHITE && row === 0) ||
        (piece.color === PlayerColor.BLACK && row === 7);
      if (isBackRow) {
        score += piece.color === player ? 10 : -10;
      }
    }
  }

  // Mobility (legal moves)
  const myMoves = CakeEngine.generateLegalMoves(board, player).length;
  const oppMoves = CakeEngine.generateLegalMoves(
    board,
    opponent,
  ).length;
  score += (myMoves - oppMoves) * 3;

  // Capture pressure
  const myCaptures = captureService.findAllCaptures(board, player).length;
  const oppCaptures = captureService.findAllCaptures(board, opponent);
  score += (myCaptures - oppCaptures.length) * 6;

  // Penalize vulnerable pieces (can be captured)
  if (oppCaptures.length > 0) {
    const threatened = new Set<number>();
    for (const capture of oppCaptures) {
      for (const pos of capture.capturedSquares) {
        threatened.add(pos.value);
      }
    }
    score -= threatened.size * 8;
  }

  return score;
};

const getDepthForLevel = (level: number): number => {
  if (level <= 1) return 2;
  if (level === 2) return 3;
  if (level === 3) return 5;
  if (level === 4) return 6;
  if (level === 5) return 7;
  if (level === 6) return 8;
  if (level >= 7) return 9;
  return 5;
};

const getRandomnessForLevel = (level: number): number => {
  if (level <= 1) return 0.18;
  if (level === 2) return 0.12;
  if (level === 3) return 0.08;
  if (level === 4) return 0.06;
  if (level === 5) return 0.04;
  if (level === 6) return 0.02;
  if (level >= 7) return 0;
  return 0.08;
};

const scoreMove = (move: Move): number => {
  const captures = move.capturedSquares.length;
  const { row, col } = move.to.toRowCol();
  const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
  const centerScore = (3.5 - centerDist) * 2;
  return captures * 100 + (move.isPromotion ? 60 : 0) + centerScore;
};

const orderMoves = (moves: Move[]): Move[] => {
  return [...moves].sort((a, b) => scoreMove(b) - scoreMove(a));
};

type TTEntry = { depth: number; score: number };

const minimax = (
  board: BoardState,
  currentPlayer: PlayerColor,
  maximizingPlayer: PlayerColor,
  depth: number,
  alpha: number,
  beta: number,
  table: Map<string, TTEntry>,
): number => {
  const key = boardKey(board, currentPlayer, maximizingPlayer);
  const cached = table.get(key);
  if (cached && cached.depth >= depth) {
    return cached.score;
  }

  if (depth === 0) {
    const score = evaluateBoard(board, maximizingPlayer);
    table.set(key, { depth, score });
    return score;
  }

  const moves = CakeEngine.generateLegalMoves(board, currentPlayer);
  if (moves.length === 0) {
    const score =
      currentPlayer === maximizingPlayer
        ? -MATE_SCORE + depth
        : MATE_SCORE - depth;
    table.set(key, { depth, score });
    return score;
  }

  const isMaximizing = currentPlayer === maximizingPlayer;
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let nextAlpha = alpha;
  let nextBeta = beta;

  const orderedMoves = orderMoves(moves);
  for (const move of orderedMoves) {
    const nextBoard = CakeEngine.applyMove(board, move);
    const score = minimax(
      nextBoard,
      getOpponent(currentPlayer),
      maximizingPlayer,
      depth - 1,
      nextAlpha,
      nextBeta,
      table,
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

  table.set(key, { depth, score: bestScore });
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
  const randomness = getRandomnessForLevel(level);
  if (Math.random() < randomness) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  if (depth === 0) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMoves: Move[] = [];
  let bestScore = -Infinity;
  const table = new Map<string, TTEntry>();
  const orderedMoves = orderMoves(moves);

  for (const move of orderedMoves) {
    const nextBoard = CakeEngine.applyMove(board, move);
    const score = minimax(
      nextBoard,
      getOpponent(player),
      player,
      depth - 1,
      -Infinity,
      Infinity,
      table,
    );

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  if (randomness === 0) {
    return bestMoves[0];
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};
