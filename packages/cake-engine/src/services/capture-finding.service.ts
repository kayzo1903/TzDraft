import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { PlayerColor } from '../constants';
import {
  CapturePath,
  Direction,
  getValidDirections,
} from '../types/capture-path.type';

/**
 * Capture Finding Service
 * Finds all possible captures for a player, including multi-capture sequences
 */
export class CaptureFindingService {
  /**
   * Find all possible captures for the current player
   */
  findAllCaptures(board: BoardState, player: PlayerColor): CapturePath[] {
    const allCaptures: CapturePath[] = [];
    const playerPieces = board.getPiecesByColor(player);

    for (const piece of playerPieces) {
      const captures = this.findCapturesForPiece(board, piece);
      allCaptures.push(...captures);
    }

    return allCaptures;
  }

  /**
   * Find all captures for a specific piece
   */
  findCapturesForPiece(board: BoardState, piece: Piece): CapturePath[] {
    const captures: CapturePath[] = [];
    const directions = getValidDirections(piece);

    for (const direction of directions) {
      const capturePaths = piece.isKing()
        ? this.findKingCaptureInDirection(board, piece, direction, [], [])
        : this.findManCaptureInDirection(board, piece, direction, [], []);
      captures.push(...capturePaths);
    }

    return captures;
  }

  /**
   * Recursively find capture sequences in a direction
   * Handles multi-capture by exploring all possible paths
   */
  private findManCaptureInDirection(
    board: BoardState,
    piece: Piece,
    direction: Direction,
    currentPath: Position[],
    capturedSoFar: Position[],
    originFrom: Position = piece.position,
    originPiece: Piece = piece,
  ): CapturePath[] {
    const { row, col } = piece.position.toRowCol();
    const opponentColor =
      piece.color === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;

    // Calculate adjacent square (where opponent piece should be)
    const adjacentRow = row + direction.row;
    const adjacentCol = col + direction.col;

    // Check bounds
    if (
      adjacentRow < 0 ||
      adjacentRow > 7 ||
      adjacentCol < 0 ||
      adjacentCol > 7
    ) {
      return [];
    }

    // Check if it's a dark square
    if ((adjacentRow + adjacentCol) % 2 === 0) {
      return [];
    }

    const adjacentPos = Position.fromRowCol(adjacentRow, adjacentCol);
    const adjacentPiece = board.getPieceAt(adjacentPos);

    // Must have opponent piece at adjacent square
    if (!adjacentPiece || adjacentPiece.color !== opponentColor) {
      return [];
    }

    // Check if this piece was already captured in this sequence
    if (capturedSoFar.some((p) => p.equals(adjacentPos))) {
      return [];
    }

    // Calculate landing square
    const landingRow = adjacentRow + direction.row;
    const landingCol = adjacentCol + direction.col;

    // Check bounds for landing square
    if (landingRow < 0 || landingRow > 7 || landingCol < 0 || landingCol > 7) {
      return [];
    }

    // Check if landing square is dark
    if ((landingRow + landingCol) % 2 === 0) {
      return [];
    }

    const landingPos = Position.fromRowCol(landingRow, landingCol);

    // Landing square must be empty
    if (board.isOccupied(landingPos)) {
      return [];
    }

    // Valid capture found!
    const newPath = [...currentPath, landingPos];
    const newCaptured = [...capturedSoFar, adjacentPos];

    // Create a temporary board with this capture applied
    let tempBoard = board.removePiece(adjacentPos);
    const movedPiece = piece.moveTo(landingPos);

    // Check for promotion (promotion ends the capture sequence immediately)
    const shouldPromote = movedPiece.shouldPromote();
    const finalPiece = shouldPromote ? movedPiece.promote() : movedPiece;

    tempBoard = tempBoard.removePiece(piece.position);
    tempBoard = tempBoard.placePiece(finalPiece);

    if (shouldPromote) {
      return [
        {
          piece: originPiece,
          from: originFrom,
          path: newPath,
          capturedSquares: newCaptured,
          to: landingPos,
          isPromotion: true,
        },
      ];
    }

    // Try to find more captures from the landing position
    const furtherCaptures: CapturePath[] = [];

    const nextDirections = getValidDirections(finalPiece);

    for (const nextDir of nextDirections) {
      const morePaths = this.findManCaptureInDirection(
        tempBoard,
        finalPiece,
        nextDir,
        newPath,
        newCaptured,
        originFrom,
        originPiece,
      );
      furtherCaptures.push(...morePaths);
    }

    // If no further captures, this is a complete path
    if (furtherCaptures.length === 0) {
      return [
        {
          piece: originPiece,
          from: originFrom,
          path: newPath,
          capturedSquares: newCaptured,
          to: landingPos,
          isPromotion: shouldPromote,
        },
      ];
    }

    // Return all extended paths
    return furtherCaptures;
  }

  /**
   * Recursively find capture sequences for a flying king in a direction
   * Kings can capture over distance and land on any empty square beyond
   */
  private findKingCaptureInDirection(
    board: BoardState,
    piece: Piece,
    direction: Direction,
    currentPath: Position[],
    capturedSoFar: Position[],
    originFrom: Position = piece.position,
    originPiece: Piece = piece,
  ): CapturePath[] {
    const { row, col } = piece.position.toRowCol();
    const opponentColor =
      piece.color === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;

    let r = row + direction.row;
    let c = col + direction.col;
    let opponentPos: Position | null = null;
    const captures: CapturePath[] = [];

    const terminalCaptures: CapturePath[] = [];
    const extendedCaptures: CapturePath[] = [];

    while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
      const pos = Position.fromRowCol(r, c);
      const occupant = board.getPieceAt(pos);

      if (occupant) {
        if (opponentPos) {
          break;
        }

        if (occupant.color !== opponentColor) {
          break;
        }

        if (capturedSoFar.some((p) => p.equals(pos))) {
          break;
        }

        opponentPos = pos;
      } else if (opponentPos) {
        const landingPos = pos;
        const newPath = [...currentPath, landingPos];
        const newCaptured = [...capturedSoFar, opponentPos];

        let tempBoard = board.removePiece(opponentPos);
        const movedPiece = piece.moveTo(landingPos);

        tempBoard = tempBoard.removePiece(piece.position);
        tempBoard = tempBoard.placePiece(movedPiece);

        const furtherCaptures: CapturePath[] = [];
        const nextDirections = getValidDirections(movedPiece);

        for (const nextDir of nextDirections) {
          const morePaths = this.findKingCaptureInDirection(
            tempBoard,
            movedPiece,
            nextDir,
            newPath,
            newCaptured,
            originFrom,
            originPiece,
          );
          furtherCaptures.push(...morePaths);
        }

        if (furtherCaptures.length === 0) {
          terminalCaptures.push({
            piece: originPiece,
            from: originFrom,
            path: newPath,
            capturedSquares: newCaptured,
            to: landingPos,
            isPromotion: false,
          });
        } else {
          extendedCaptures.push(...furtherCaptures);
        }
      }

      r += direction.row;
      c += direction.col;
    }

    if (extendedCaptures.length > 0) {
      return extendedCaptures;
    }
    return terminalCaptures;
  }


  /**
   * Check if a specific capture is valid
   */
  isValidCapture(
    board: BoardState,
    piece: Piece,
    to: Position,
    capturedSquares: Position[],
  ): boolean {
    const allCaptures = this.findCapturesForPiece(board, piece);

    return allCaptures.some(
      (capture) =>
        capture.to.equals(to) &&
        capture.capturedSquares.length === capturedSquares.length &&
        capture.capturedSquares.every((cs, i) => cs.equals(capturedSquares[i])),
    );
  }

  /**
   * Check if any captures are available for the player
   */
  hasCapturesAvailable(board: BoardState, player: PlayerColor): boolean {
    return this.findAllCaptures(board, player).length > 0;
  }
}
