import { Game } from '../entities/game.entity';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { BoardState } from '../value-objects/board-state.vo';
import { Move } from '../entities/move.entity';
import {
  PlayerColor,
  Winner,
  EndReason,
} from '../../../shared/constants/game.constants';
import { CaptureFindingService } from './capture-finding.service';

type EndgameType = 'KvsK' | 'KManVsK' | 'KKvsK' | null;

export interface PostMoveOutcome {
  winner: Winner;
  reason: EndReason;
  noMoves?: boolean;
}

export interface DrawClaimAvailability {
  threefoldRepetition: boolean;
  thirtyMoveRule: boolean;
}

export interface PostMoveEvaluationResult {
  outcome: PostMoveOutcome | null;
  drawClaimAvailable: DrawClaimAvailability;
}

/**
 * Game Rules Service
 * Handles game-level rules like promotion, game end detection, and draw conditions
 */
export class GameRulesService {
  private captureFindingService: CaptureFindingService;

  constructor() {
    this.captureFindingService = new CaptureFindingService();
  }

  private togglePlayer(player: PlayerColor): PlayerColor {
    return player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
  }

  private getPositionKey(board: BoardState, playerToMove: PlayerColor): string {
    const pieces = board
      .getAllPieces()
      .sort((a, b) => a.position.value - b.position.value)
      .map(
        (piece) =>
          `${piece.position.value}${piece.color[0]}${piece.isKing() ? 'K' : 'M'}`,
      )
      .join('');
    return `${playerToMove}|${pieces}`;
  }

  private getMaterialCounts(board: BoardState): {
    whiteMen: number;
    whiteKings: number;
    blackMen: number;
    blackKings: number;
  } {
    const counts = {
      whiteMen: 0,
      whiteKings: 0,
      blackMen: 0,
      blackKings: 0,
    };

    for (const piece of board.getAllPieces()) {
      if (piece.color === PlayerColor.WHITE) {
        if (piece.isKing()) counts.whiteKings += 1;
        else counts.whiteMen += 1;
      } else if (piece.isKing()) {
        counts.blackKings += 1;
      } else {
        counts.blackMen += 1;
      }
    }

    return counts;
  }

  private getEndgameTypeFromCounts(counts: {
    whiteMen: number;
    whiteKings: number;
    blackMen: number;
    blackKings: number;
  }): EndgameType {
    const totalPieces =
      counts.whiteMen + counts.whiteKings + counts.blackMen + counts.blackKings;

    if (
      totalPieces === 2 &&
      counts.whiteKings === 1 &&
      counts.blackKings === 1 &&
      counts.whiteMen === 0 &&
      counts.blackMen === 0
    ) {
      return 'KvsK';
    }

    if (totalPieces === 3) {
      const whiteKManVsBlackK =
        counts.whiteKings === 1 &&
        counts.whiteMen === 1 &&
        counts.blackKings === 1 &&
        counts.blackMen === 0;
      const blackKManVsWhiteK =
        counts.blackKings === 1 &&
        counts.blackMen === 1 &&
        counts.whiteKings === 1 &&
        counts.whiteMen === 0;
      if (whiteKManVsBlackK || blackKManVsWhiteK) return 'KManVsK';
    }

    if (totalPieces === 3) {
      const whiteTwoKingsVsBlackKing =
        counts.whiteKings === 2 &&
        counts.whiteMen === 0 &&
        counts.blackKings === 1 &&
        counts.blackMen === 0;
      const blackTwoKingsVsWhiteKing =
        counts.blackKings === 2 &&
        counts.blackMen === 0 &&
        counts.whiteKings === 1 &&
        counts.whiteMen === 0;
      if (whiteTwoKingsVsBlackKing || blackTwoKingsVsWhiteKing) return 'KKvsK';
    }

    return null;
  }

  private getEndgameStrongerSide(
    counts: {
      whiteMen: number;
      whiteKings: number;
      blackMen: number;
      blackKings: number;
    },
    endgameType: EndgameType,
  ): PlayerColor | null {
    if (endgameType === 'KvsK') return null;

    const whiteMaterial = counts.whiteMen + counts.whiteKings;
    const blackMaterial = counts.blackMen + counts.blackKings;

    if (whiteMaterial > blackMaterial) return PlayerColor.WHITE;
    if (blackMaterial > whiteMaterial) return PlayerColor.BLACK;
    return null;
  }

  private getThreeKingsStrongerSide(counts: {
    whiteMen: number;
    whiteKings: number;
    blackMen: number;
    blackKings: number;
  }): PlayerColor | null {
    const onlyKings = counts.whiteMen === 0 && counts.blackMen === 0;
    if (!onlyKings) return null;

    if (counts.whiteKings >= 3 && counts.blackKings === 1) return PlayerColor.WHITE;
    if (counts.blackKings >= 3 && counts.whiteKings === 1) return PlayerColor.BLACK;
    return null;
  }

  private applyMoveToBoard(board: BoardState, move: Move): BoardState {
    let nextBoard = board;
    for (const capturedPos of move.capturedSquares) {
      nextBoard = nextBoard.removePiece(capturedPos);
    }
    nextBoard = nextBoard.movePiece(move.from, move.to);
    return nextBoard;
  }

  private analyzeDrawRules(game: Game): {
    drawByArticle84: boolean;
    drawByArticle85: boolean;
    drawByThreefoldRepetition: boolean;
    drawByThirtyMoveRule: boolean;
    drawClaimAvailable: DrawClaimAvailability;
  } {
    const repetition = new Map<string, number>();
    let board = BoardState.createInitialBoard();
    let playerToMove = PlayerColor.WHITE;

    const startKey = this.getPositionKey(board, playerToMove);
    repetition.set(startKey, 1);

    let kingOnlyNonCapturePly = 0;
    let article84Type: EndgameType = null;
    let article84Stronger: PlayerColor | null = null;
    let article84StrongerMoves = 0;

    let article85Stronger: PlayerColor | null = null;
    let article85StrongerMoves = 0;

    const sortedMoves = [...game.moves].sort((a, b) => a.moveNumber - b.moveNumber);
    for (const move of sortedMoves) {
      const nextBoard = this.applyMoveToBoard(board, move);
      const counts = this.getMaterialCounts(nextBoard);
      const isCapture = move.capturedSquares.length > 0;

      const onlyKings = counts.whiteMen === 0 && counts.blackMen === 0;
      kingOnlyNonCapturePly =
        onlyKings && !isCapture ? kingOnlyNonCapturePly + 1 : 0;

      const endgameType = this.getEndgameTypeFromCounts(counts);
      if (!endgameType) {
        article84Type = null;
        article84Stronger = null;
        article84StrongerMoves = 0;
      } else {
        const stronger = this.getEndgameStrongerSide(counts, endgameType);
        const isSameTrackingState =
          article84Type === endgameType && article84Stronger === stronger;
        if (!isSameTrackingState) {
          article84StrongerMoves = 0;
        }
        article84Type = endgameType;
        article84Stronger = stronger;
        if (!stronger || move.player === stronger) {
          article84StrongerMoves += 1;
        }
      }

      const stronger85 = this.getThreeKingsStrongerSide(counts);
      if (!stronger85) {
        article85Stronger = null;
        article85StrongerMoves = 0;
      } else {
        if (article85Stronger !== stronger85) {
          article85StrongerMoves = 0;
        }
        article85Stronger = stronger85;
        if (move.player === stronger85) {
          article85StrongerMoves += 1;
        }
      }

      playerToMove = this.togglePlayer(playerToMove);
      const key = this.getPositionKey(nextBoard, playerToMove);
      repetition.set(key, (repetition.get(key) ?? 0) + 1);
      board = nextBoard;
    }

    const finalKey = this.getPositionKey(game.board, game.currentTurn);
    const repetitionCount = repetition.get(finalKey) ?? 0;

    const article84MoveLimit = article84Stronger ? 5 : 10;
    const drawByArticle84 =
      !!article84Type && article84StrongerMoves >= article84MoveLimit;
    const drawByArticle85 = !!article85Stronger && article85StrongerMoves >= 12;

    return {
      drawByArticle84,
      drawByArticle85,
      drawByThreefoldRepetition: repetitionCount >= 3,
      drawByThirtyMoveRule: kingOnlyNonCapturePly >= 60,
      drawClaimAvailable: {
        threefoldRepetition: repetitionCount >= 3,
        thirtyMoveRule: kingOnlyNonCapturePly >= 60,
      },
    };
  }

  evaluatePostMove(game: Game): PostMoveEvaluationResult {
    const currentPlayerPieces = game.board.getPiecesByColor(game.currentTurn);
    if (currentPlayerPieces.length === 0) {
      return {
        outcome: {
          winner:
            game.currentTurn === PlayerColor.WHITE ? Winner.BLACK : Winner.WHITE,
          reason: EndReason.CHECKMATE,
        },
        drawClaimAvailable: {
          threefoldRepetition: false,
          thirtyMoveRule: false,
        },
      };
    }

    if (!this.hasLegalMoves(game, game.currentTurn)) {
      return {
        outcome: {
          winner:
            game.currentTurn === PlayerColor.WHITE ? Winner.BLACK : Winner.WHITE,
          reason: EndReason.CHECKMATE,
          noMoves: true,
        },
        drawClaimAvailable: {
          threefoldRepetition: false,
          thirtyMoveRule: false,
        },
      };
    }

    const drawAnalysis = this.analyzeDrawRules(game);
    if (
      drawAnalysis.drawByArticle84 ||
      drawAnalysis.drawByArticle85 ||
      drawAnalysis.drawByThreefoldRepetition ||
      drawAnalysis.drawByThirtyMoveRule
    ) {
      return {
        outcome: {
          winner: Winner.DRAW,
          reason: EndReason.DRAW,
        },
        drawClaimAvailable: drawAnalysis.drawClaimAvailable,
      };
    }

    return {
      outcome: null,
      drawClaimAvailable: drawAnalysis.drawClaimAvailable,
    };
  }

  isTimeoutDrawByInsufficientMaterial(
    board: BoardState,
    winnerColor: PlayerColor,
  ): boolean {
    const counts = this.getMaterialCounts(board);

    if (winnerColor === PlayerColor.WHITE) {
      if (
        counts.whiteKings === 1 &&
        counts.whiteMen === 0 &&
        counts.blackKings === 1 &&
        counts.blackMen === 0
      ) {
        return true;
      }
      if (
        counts.whiteKings === 1 &&
        counts.whiteMen === 1 &&
        counts.blackKings === 1 &&
        counts.blackMen === 0
      ) {
        return true;
      }
      if (
        counts.whiteKings === 2 &&
        counts.whiteMen === 0 &&
        counts.blackKings === 1 &&
        counts.blackMen === 0
      ) {
        return true;
      }
      return false;
    }

    if (
      counts.blackKings === 1 &&
      counts.blackMen === 0 &&
      counts.whiteKings === 1 &&
      counts.whiteMen === 0
    ) {
      return true;
    }
    if (
      counts.blackKings === 1 &&
      counts.blackMen === 1 &&
      counts.whiteKings === 1 &&
      counts.whiteMen === 0
    ) {
      return true;
    }
    if (
      counts.blackKings === 2 &&
      counts.blackMen === 0 &&
      counts.whiteKings === 1 &&
      counts.whiteMen === 0
    ) {
      return true;
    }
    return false;
  }

  /**
   * Check if a piece should be promoted
   */
  shouldPromote(piece: Piece, position: Position): boolean {
    if (piece.isKing()) {
      return false;
    }

    const { row } = position.toRowCol();

    // White moves "down" (toward row 7); Black moves "up" (toward row 0).
    // Promotion happens on the opponent's back row.
    if (piece.color === PlayerColor.WHITE && row === 7) {
      return true;
    }

    if (piece.color === PlayerColor.BLACK && row === 0) {
      return true;
    }

    return false;
  }

  /**
   * Promote a piece to king
   */
  promotePiece(piece: Piece): Piece {
    if (piece.isKing()) {
      return piece;
    }
    return piece.promote();
  }

  /**
   * Check if the game is over
   */
  isGameOver(game: Game): boolean {
    if (game.isGameOver()) {
      return true;
    }

    // Check if current player has no pieces
    const currentPlayerPieces = game.board.getPiecesByColor(game.currentTurn);
    if (currentPlayerPieces.length === 0) {
      return true;
    }

    // Check if current player has no legal moves
    if (!this.hasLegalMoves(game, game.currentTurn)) {
      return true;
    }

    return false;
  }

  /**
   * Detect the winner
   */
  detectWinner(game: Game): Winner | null {
    const whitePieces = game.board.getPiecesByColor(PlayerColor.WHITE);
    const blackPieces = game.board.getPiecesByColor(PlayerColor.BLACK);

    // No pieces left
    if (whitePieces.length === 0) {
      return Winner.BLACK;
    }
    if (blackPieces.length === 0) {
      return Winner.WHITE;
    }

    // No legal moves (stalemate - opponent wins)
    const whiteHasMoves = this.hasLegalMoves(game, PlayerColor.WHITE);
    const blackHasMoves = this.hasLegalMoves(game, PlayerColor.BLACK);

    if (!whiteHasMoves && game.currentTurn === PlayerColor.WHITE) {
      return Winner.BLACK;
    }
    if (!blackHasMoves && game.currentTurn === PlayerColor.BLACK) {
      return Winner.WHITE;
    }

    return null;
  }

  /**
   * Check if a player has any legal moves
   */
  hasLegalMoves(game: Game, player: PlayerColor): boolean {
    // Check for captures first (mandatory)
    const captures = this.captureFindingService.findAllCaptures(
      game.board,
      player,
    );

    if (captures.length > 0) {
      return true;
    }

    // Check for simple moves
    const pieces = game.board.getPiecesByColor(player);

    for (const piece of pieces) {
      if (this.hasSimpleMovesForPiece(game.board, piece)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a piece has any simple (non-capture) moves
   */
  private hasSimpleMovesForPiece(board: BoardState, piece: Piece): boolean {
    const { row, col } = piece.position.toRowCol();

    // Determine valid directions based on piece type
    const directions = piece.isKing()
      ? [
          { row: 1, col: 1 },
          { row: 1, col: -1 },
          { row: -1, col: 1 },
          { row: -1, col: -1 },
        ]
      : piece.color === PlayerColor.WHITE
        ? [
            { row: 1, col: 1 },
            { row: 1, col: -1 },
          ]
        : [
            { row: -1, col: 1 },
            { row: -1, col: -1 },
          ];

    for (const dir of directions) {
      const newRow = row + dir.row;
      const newCol = col + dir.col;

      // Check bounds
      if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) {
        continue;
      }

      // Check if it's a dark square
      if ((newRow + newCol) % 2 === 0) {
        continue;
      }

      const targetPos = Position.fromRowCol(newRow, newCol);

      // Check if square is empty
      if (board.isEmpty(targetPos)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for draw by insufficient material
   * (e.g., king vs king)
   */
  isDrawByInsufficientMaterial(board: BoardState): boolean {
    const whitePieces = board.getPiecesByColor(PlayerColor.WHITE);
    const blackPieces = board.getPiecesByColor(PlayerColor.BLACK);

    // King vs King
    if (
      whitePieces.length === 1 &&
      blackPieces.length === 1 &&
      whitePieces[0].isKing() &&
      blackPieces[0].isKing()
    ) {
      return true;
    }

    return false;
  }

  /**
   * End the game with a result
   */
  endGame(game: Game, winner: Winner, reason: EndReason): void {
    game.endGame(winner, reason);
  }

  /**
   * Count pieces for a player
   */
  countPieces(board: BoardState, player: PlayerColor): number {
    return board.countPieces(player);
  }
}
