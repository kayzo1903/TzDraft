import {
  BoardState,
  Move,
  PlayerColor,
  Winner,
  EndReason,
  Game,
  GameType,
  GameStatus,
  Position,
  CakeEngine,
  GameRulesService,
  PieceType,
} from "@tzdraft/cake-engine";

export interface GameResult {
  winner: Winner;
  reason: EndReason;
}

export type EndgameType = "KvsK" | "KManVsK" | "KKvsK" | null;

export interface OfficialRuleState {
  repetition: Record<string, number>;
  kingOnlyNonCapturePly: number;
  endgamePly: number;
  imbalanceMovesByStronger: number;
}

const THREEFOLD_REPETITION = 3;
const KING_ONLY_NON_CAPTURE_PLY_LIMIT = 60; // 30 moves by both players.
const ENDGAME_PLY_LIMIT = 10; // 5 moves by both players.
const THREE_KINGS_STRONGER_MOVES_LIMIT = 12;

const getPositionKey = (
  board: BoardState,
  playerToMove: PlayerColor,
): string => {
  const pieces = board
    .getAllPieces()
    .sort((a, b) => a.position.value - b.position.value)
    .map(
      (p) =>
        `${p.position.value}${p.color[0]}${
          p.type === PieceType.KING ? "K" : "M"
        }`,
    )
    .join("");
  return `${playerToMove}|${pieces}`;
};

const getMaterialCounts = (board: BoardState) => {
  const pieces = board.getAllPieces();
  let whiteMen = 0;
  let whiteKings = 0;
  let blackMen = 0;
  let blackKings = 0;

  for (const piece of pieces) {
    if (piece.color === PlayerColor.WHITE) {
      if (piece.type === PieceType.KING) whiteKings += 1;
      else whiteMen += 1;
    } else {
      if (piece.type === PieceType.KING) blackKings += 1;
      else blackMen += 1;
    }
  }

  return { whiteMen, whiteKings, blackMen, blackKings };
};

const isOnlyKings = (board: BoardState): boolean => {
  const { whiteMen, blackMen } = getMaterialCounts(board);
  return whiteMen === 0 && blackMen === 0;
};

export const getEndgameType = (board: BoardState): EndgameType => {
  const { whiteMen, whiteKings, blackMen, blackKings } = getMaterialCounts(board);
  const totalPieces = whiteMen + whiteKings + blackMen + blackKings;

  if (totalPieces === 2 && whiteKings === 1 && blackKings === 1) {
    return "KvsK";
  }

  if (totalPieces === 3) {
    const whiteHasKMan = whiteKings === 1 && whiteMen === 1 && blackKings === 1;
    const blackHasKMan = blackKings === 1 && blackMen === 1 && whiteKings === 1;
    if (whiteHasKMan || blackHasKMan) return "KManVsK";
  }

  if (totalPieces === 3) {
    const whiteHasTwoKings = whiteKings === 2 && blackKings === 1 && blackMen === 0 && whiteMen === 0;
    const blackHasTwoKings = blackKings === 2 && whiteKings === 1 && blackMen === 0 && whiteMen === 0;
    if (whiteHasTwoKings || blackHasTwoKings) return "KKvsK";
  }

  return null;
};

export const getThreeKingsImbalance = (
  board: BoardState,
): PlayerColor | null => {
  if (!isOnlyKings(board)) return null;

  const { whiteKings, blackKings } = getMaterialCounts(board);
  if (whiteKings >= 3 && blackKings === 1) return PlayerColor.WHITE;
  if (blackKings >= 3 && whiteKings === 1) return PlayerColor.BLACK;
  return null;
};

const updateRepetition = (
  repetition: Record<string, number>,
  key: string,
): Record<string, number> => {
  const next = { ...repetition };
  next[key] = (next[key] ?? 0) + 1;
  return next;
};

export const OfficialEngine = {
  createInitialState(): BoardState {
    return CakeEngine.createInitialState();
  },

  createInitialRuleState(
    board: BoardState,
    currentPlayer: PlayerColor,
  ): OfficialRuleState {
    const key = getPositionKey(board, currentPlayer);
    return {
      repetition: { [key]: 1 },
      kingOnlyNonCapturePly: 0,
      endgamePly: 0,
      imbalanceMovesByStronger: 0,
    };
  },

  updateRuleState(
    prevState: OfficialRuleState,
    prevBoard: BoardState,
    move: Move,
    nextBoard: BoardState,
    nextPlayer: PlayerColor,
  ): OfficialRuleState {
    const nextRepetition = updateRepetition(
      prevState.repetition,
      getPositionKey(nextBoard, nextPlayer),
    );

    const isCapture = move.capturedSquares.length > 0;
    const onlyKings = isOnlyKings(nextBoard);
    const kingOnlyNonCapturePly =
      onlyKings && !isCapture ? prevState.kingOnlyNonCapturePly + 1 : 0;

    const endgameType = getEndgameType(nextBoard);
    const endgamePly = endgameType ? prevState.endgamePly + 1 : 0;

    const favored = getThreeKingsImbalance(nextBoard);
    let imbalanceMovesByStronger = 0;
    if (favored) {
      imbalanceMovesByStronger =
        prevState.imbalanceMovesByStronger + (move.player === favored ? 1 : 0);
    }

    return {
      repetition: nextRepetition,
      kingOnlyNonCapturePly,
      endgamePly,
      imbalanceMovesByStronger,
    };
  },

  generateLegalMoves(
    state: BoardState,
    player: PlayerColor,
    moveCount: number = 0,
  ): Move[] {
    return CakeEngine.generateLegalMoves(state, player, moveCount);
  },

  applyMove(state: BoardState, move: Move): BoardState {
    return CakeEngine.applyMove(state, move);
  },

  evaluateGameResult(
    state: BoardState,
    currentPlayer: PlayerColor,
    ruleState: OfficialRuleState,
  ): GameResult | null {
    const rulesService = new GameRulesService();

    const winner = rulesService.detectWinner(state, currentPlayer);
    if (winner) {
      let reason = EndReason.RESIGN;
      if (winner === Winner.WHITE && currentPlayer === PlayerColor.BLACK) {
        reason = EndReason.CHECKMATE;
      } else if (winner === Winner.BLACK && currentPlayer === PlayerColor.WHITE) {
        reason = EndReason.CHECKMATE;
      }
      return { winner, reason };
    }

    const repetitionCount =
      ruleState.repetition[getPositionKey(state, currentPlayer)] ?? 0;
    if (repetitionCount >= THREEFOLD_REPETITION) {
      return { winner: Winner.DRAW, reason: EndReason.DRAW };
    }

    if (ruleState.kingOnlyNonCapturePly >= KING_ONLY_NON_CAPTURE_PLY_LIMIT) {
      return { winner: Winner.DRAW, reason: EndReason.DRAW };
    }

    if (ruleState.endgamePly >= ENDGAME_PLY_LIMIT && getEndgameType(state)) {
      return { winner: Winner.DRAW, reason: EndReason.DRAW };
    }

    if (
      ruleState.imbalanceMovesByStronger >= THREE_KINGS_STRONGER_MOVES_LIMIT &&
      getThreeKingsImbalance(state)
    ) {
      return { winner: Winner.DRAW, reason: EndReason.DRAW };
    }

    return null;
  },

  createGame(
    id: string,
    whitePlayerId: string,
    blackPlayerId: string | null,
    gameType: GameType = GameType.CASUAL,
  ): Game {
    return new Game(
      id,
      whitePlayerId,
      blackPlayerId,
      gameType,
      null,
      null,
      null,
      600000,
      undefined,
      new Date(),
      null,
      null,
      GameStatus.WAITING,
      null,
      null,
      PlayerColor.WHITE,
    );
  },

  createPosition(value: number): Position {
    return new Position(value);
  },

  createMove(
    id: string,
    gameId: string,
    moveNumber: number,
    player: PlayerColor,
    from: Position,
    to: Position,
    capturedSquares: Position[] = [],
    isPromotion: boolean = false,
  ): Move {
    return CakeEngine.createMove(
      id,
      gameId,
      moveNumber,
      player,
      from,
      to,
      capturedSquares,
      isPromotion,
    );
  },
};
