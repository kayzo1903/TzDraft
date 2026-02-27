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

const MATE_SCORE = 100_000;
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

// Transposition-table flag types
type TTFlag = "EXACT" | "LOWER" | "UPPER";

type TTEntry = {
  depth: number;
  score: number;
  flag: TTFlag;
};

const boardKey = (
  board: BoardState,
  currentPlayer: PlayerColor,
  maximizingPlayer: PlayerColor,
): string => {
  const pieces = board
    .getAllPieces()
    .sort((a, b) => a.position.value - b.position.value)
    .map(
      (p) =>
        `${p.position.value}${p.color[0]}${p.type === PieceType.KING ? "K" : "M"}`,
    )
    .join("");
  return `${currentPlayer}|${maximizingPlayer}|${pieces}`;
};

const captureService = new CaptureFindingService();

const evaluateBoard = (board: BoardState, player: PlayerColor): number => {
  const pieces = board.getAllPieces();
  const opponent = getOpponent(player);
  let score = 0;

  let myCount = 0;
  let oppCount = 0;

  for (const piece of pieces) {
    const value = PIECE_VALUES[piece.type];
    const isPlayer = piece.color === player;
    score += isPlayer ? value : -value;

    if (isPlayer) myCount++;
    else oppCount++;

    // Piece-square table
    const { row, col } = piece.position.toRowCol();
    const rowForPst = piece.color === PlayerColor.WHITE ? row : 7 - row;
    const pstValue =
      piece.type === PieceType.KING
        ? KING_PST[rowForPst][col]
        : MAN_PST[rowForPst][col];
    score += isPlayer ? pstValue : -pstValue;

    // Man advancement bonus
    if (piece.type === PieceType.MAN) {
      const advance = piece.color === PlayerColor.WHITE ? row : 7 - row;
      score += isPlayer ? advance * 3 : -(advance * 3);

      // Back-row guard bonus
      const isBackRow =
        (piece.color === PlayerColor.WHITE && row === 0) ||
        (piece.color === PlayerColor.BLACK && row === 7);
      if (isBackRow) score += isPlayer ? 10 : -10;
    }
  }

  // Material advantage amplifier (being up material is worth more when up)
  score += (myCount - oppCount) * 5;

  // Mobility: call generateLegalMoves once per side
  const myMoves = CakeEngine.generateLegalMoves(board, player).length;
  const oppMoves = CakeEngine.generateLegalMoves(board, opponent).length;
  score += (myMoves - oppMoves) * 3;

  // Threat penalty: penalise each threatened piece by 75% of its actual value
  const oppCaptures = captureService.findAllCaptures(board, opponent);
  if (oppCaptures.length > 0) {
    const threatened = new Set<number>();
    for (const capture of oppCaptures) {
      for (const pos of capture.capturedSquares) {
        threatened.add(pos.value);
      }
    }
    for (const pos of threatened) {
      const threatenedPiece = pieces.find(
        (p) => p.position.value === pos && p.color === player,
      );
      if (threatenedPiece) {
        score -= PIECE_VALUES[threatenedPiece.type] * 0.75;
      }
    }
  }

  // Capture pressure delta (opponent - us)
  const myCaptures = captureService.findAllCaptures(board, player).length;
  score += (myCaptures - oppCaptures.length) * 6;

  return score;
};

const getDepthForLevel = (level: number): number => {
  if (level <= 2) return 2;
  if (level <= 4) return 3;
  if (level <= 6) return 4;
  if (level <= 9) return 5;
  if (level <= 12) return 6;
  if (level <= 15) return 7;
  if (level <= 17) return 8;
  return 9;
};

/** Time budget in ms given a level. Higher levels get more think time. */
const getTimeBudgetForLevel = (level: number): number => {
  if (level <= 2) return 200;
  if (level <= 4) return 400;
  if (level <= 6) return 700;
  if (level <= 9) return 1200;
  return 2000; // levels 10+ are handled by the backend, but keep a sane ceiling
};

const getRandomnessForLevel = (level: number): number => {
  if (level <= 2) return 0.2;
  if (level <= 4) return 0.15;
  if (level <= 6) return 0.11;
  if (level <= 9) return 0.08;
  if (level <= 12) return 0.05;
  if (level <= 15) return 0.03;
  if (level <= 17) return 0.015;
  return 0;
};

const scoreMove = (move: Move): number => {
  const captures = move.capturedSquares.length;
  const { row, col } = move.to.toRowCol();
  const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
  const centerScore = (3.5 - centerDist) * 2;
  return captures * 100 + (move.isPromotion ? 60 : 0) + centerScore;
};

const orderMoves = (moves: Move[]): Move[] =>
  [...moves].sort((a, b) => scoreMove(b) - scoreMove(a));

// ─────────────────────────────────────────────────────────────────────────────
// Alpha-beta minimax with proper TT bound semantics
// ─────────────────────────────────────────────────────────────────────────────

const minimax = (
  board: BoardState,
  currentPlayer: PlayerColor,
  maximizingPlayer: PlayerColor,
  depth: number,
  alpha: number,
  beta: number,
  table: Map<string, TTEntry>,
  deadline: number,
): number => {
  // Time check — abort early if we've exceeded the budget
  if (Date.now() >= deadline) {
    return evaluateBoard(board, maximizingPlayer);
  }

  const key = boardKey(board, currentPlayer, maximizingPlayer);
  const cached = table.get(key);

  if (cached && cached.depth >= depth) {
    if (cached.flag === "EXACT") return cached.score;
    if (cached.flag === "LOWER") alpha = Math.max(alpha, cached.score);
    else if (cached.flag === "UPPER") beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }

  if (depth === 0) {
    const score = evaluateBoard(board, maximizingPlayer);
    table.set(key, { depth: 0, score, flag: "EXACT" });
    return score;
  }

  const moves = CakeEngine.generateLegalMoves(board, currentPlayer);
  if (moves.length === 0) {
    const score =
      currentPlayer === maximizingPlayer
        ? -MATE_SCORE + depth
        : MATE_SCORE - depth;
    table.set(key, { depth, score, flag: "EXACT" });
    return score;
  }

  const isMaximizing = currentPlayer === maximizingPlayer;
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let flag: TTFlag = "UPPER"; // assume we won't beat alpha (for maximizer)
  if (!isMaximizing) flag = "LOWER"; // assume we won't beat beta (for minimizer)

  const orderedMoves = orderMoves(moves);

  for (const move of orderedMoves) {
    if (Date.now() >= deadline) break;

    const nextBoard = CakeEngine.applyMove(board, move);
    const score = minimax(
      nextBoard,
      getOpponent(currentPlayer),
      maximizingPlayer,
      depth - 1,
      alpha,
      beta,
      table,
      deadline,
    );

    if (isMaximizing) {
      if (score > bestScore) {
        bestScore = score;
        if (score > alpha) {
          alpha = score;
          flag = score >= beta ? "LOWER" : "EXACT";
        }
      }
      if (alpha >= beta) break;
    } else {
      if (score < bestScore) {
        bestScore = score;
        if (score < beta) {
          beta = score;
          flag = score <= alpha ? "UPPER" : "EXACT";
        }
      }
      if (alpha >= beta) break;
    }
  }

  table.set(key, { depth, score: bestScore, flag });
  return bestScore;
};

// ─────────────────────────────────────────────────────────────────────────────
// Iterative deepening driver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated AI logic for levels ≥ 10 is routed through the backend NestJS
 * `/api/ai/move` endpoint. This local implementation handles levels 1-9 and
 * acts as an emergency fallback for higher levels when the backend is offline.
 */
export const getBestMove = (
  board: BoardState,
  player: PlayerColor,
  level: number,
): Move | null => {
  const moves = CakeEngine.generateLegalMoves(board, player);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const maxDepth = getDepthForLevel(level);
  const randomness = getRandomnessForLevel(level);

  if (Math.random() < randomness) {
    // Avoid randomly walking into an immediate capture — filter to safe landing squares
    const safeMoves = moves.filter((m) => {
      const nextBoard = CakeEngine.applyMove(board, m);
      const replies = captureService.findAllCaptures(nextBoard, getOpponent(player));
      const retaken = new Set(replies.flatMap((c) => c.capturedSquares.map((p) => p.value)));
      return !retaken.has(m.to.value);
    });
    const pool = safeMoves.length > 0 ? safeMoves : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const budget = getTimeBudgetForLevel(level);
  const deadline = Date.now() + budget;
  const table = new Map<string, TTEntry>();

  let bestMove: Move = orderMoves(moves)[0]; // safe default: best-ordered move
  let bestScore = -Infinity;

  // Iterative deepening: start at depth 1, increase until maxDepth or time runs out
  for (let depth = 1; depth <= maxDepth; depth++) {
    if (Date.now() >= deadline) break;

    let iterBestMoves: Move[] = [];
    let iterBestScore = -Infinity;

    const orderedMoves = orderMoves(moves);

    for (const move of orderedMoves) {
      if (Date.now() >= deadline) break;

      const nextBoard = CakeEngine.applyMove(board, move);
      const score = minimax(
        nextBoard,
        getOpponent(player),
        player,
        depth - 1,
        -Infinity,
        Infinity,
        table,
        deadline,
      );

      if (score > iterBestScore) {
        iterBestScore = score;
        iterBestMoves = [move];
      } else if (score === iterBestScore) {
        iterBestMoves.push(move);
      }
    }

    // Only commit results from a fully searched iteration
    if (iterBestMoves.length > 0 && Date.now() < deadline) {
      bestScore = iterBestScore;
      bestMove =
        iterBestMoves[Math.floor(Math.random() * iterBestMoves.length)];
    }
  }

  void bestScore; // used for future logging
  return bestMove;
};
