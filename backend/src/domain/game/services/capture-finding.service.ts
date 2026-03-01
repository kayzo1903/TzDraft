import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { PlayerColor } from '../../../shared/constants/game.constants';
import {
  CapturePath,
  Direction,
  getValidDirections,
} from '../types/capture-path.type';

/**
 * Capture Finding Service
 * Finds all possible captures for a player, including multi-capture sequences.
 *
 * TZD capture rules (Articles 4.5 & 4.9):
 * - Men MUST continue capturing when further forward captures are available
 *   (Article 4.5). Only complete paths are returned for men.
 * - Kings choose their landing square freely; the choice of where to land
 *   determines whether continuation is possible.
 * - "Free choice" (Article 4.9) means choosing among complete sequences,
 *   not the ability to stop mid-sequence. It ensures players are NOT forced
 *   to pick the longest chain (unlike the Brazilian maximum-capture rule).
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
   * Recursively find man capture sequences in a direction.
   * Men capture forward only (TZD Article 4.6) and land exactly one square
   * beyond the captured piece.
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

    const adjacentRow = row + direction.row;
    const adjacentCol = col + direction.col;

    if (
      adjacentRow < 0 ||
      adjacentRow > 7 ||
      adjacentCol < 0 ||
      adjacentCol > 7
    )
      return [];
    if ((adjacentRow + adjacentCol) % 2 === 0) return [];

    const adjacentPos = Position.fromRowCol(adjacentRow, adjacentCol);
    const adjacentPiece = board.getPieceAt(adjacentPos);

    if (!adjacentPiece || adjacentPiece.color !== opponentColor) return [];
    if (capturedSoFar.some((p) => p.equals(adjacentPos))) return [];

    const landingRow = adjacentRow + direction.row;
    const landingCol = adjacentCol + direction.col;

    if (landingRow < 0 || landingRow > 7 || landingCol < 0 || landingCol > 7)
      return [];
    if ((landingRow + landingCol) % 2 === 0) return [];

    const landingPos = Position.fromRowCol(landingRow, landingCol);
    if (board.isOccupied(landingPos)) return [];

    const newPath = [...currentPath, landingPos];
    const newCaptured = [...capturedSoFar, adjacentPos];

    const movedPiece = piece.moveTo(landingPos);
    const shouldPromote = movedPiece.shouldPromote();
    const finalPiece = shouldPromote ? movedPiece.promote() : movedPiece;

    // Build temp board for recursive search
    let tempBoard = board.removePiece(adjacentPos);
    tempBoard = tempBoard.removePiece(piece.position);
    tempBoard = tempBoard.placePiece(finalPiece);

    const currentEndpoint: CapturePath = {
      piece: originPiece,
      from: originFrom,
      path: newPath,
      capturedSquares: newCaptured,
      to: landingPos,
      isPromotion: shouldPromote,
    };

    // TZD: promotion during capture ends the sequence immediately (Article 4.10)
    if (shouldPromote) {
      return [currentEndpoint];
    }

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

    if (furtherCaptures.length === 0) {
      return [currentEndpoint];
    }

    // TZD Article 4.5: men MUST continue capturing when further captures are
    // available. "Free choice" (Article 4.9) means choosing among complete
    // sequences — not stopping mid-sequence. Only return complete paths.
    return furtherCaptures;
  }

  /**
   * Recursively find flying-king capture sequences in a direction.
   * Kings slide any number of squares before and after capturing.
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

    const terminalCaptures: CapturePath[] = [];
    const extendedCaptures: CapturePath[] = [];

    while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
      const pos = Position.fromRowCol(r, c);
      const occupant = board.getPieceAt(pos);

      if (occupant) {
        if (opponentPos) break; // blocked by a second piece
        if (occupant.color !== opponentColor) break; // own piece blocks
        if (capturedSoFar.some((p) => p.equals(pos))) break; // already captured
        opponentPos = pos;
      } else if (opponentPos) {
        // This square is a valid landing square after jumping opponentPos
        const landingPos = pos;
        const newPath = [...currentPath, landingPos];
        const newCaptured = [...capturedSoFar, opponentPos];

        const movedPiece = piece.moveTo(landingPos);
        let tempBoard = board.removePiece(piece.position);
        // Remove the captured piece so recursive searches can slide through
        // that square in the opposite direction (king jumps A, then continues
        // past A's old square to reach another piece C on the same diagonal).
        tempBoard = tempBoard.removePiece(opponentPos);
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
          // TZD Art 4.6: the king cannot fly past a square from which further
          // captures are mandatory. Any landing square further along this
          // diagonal would bypass that obligation, making it illegal.
          break;
        }
      }

      r += direction.row;
      c += direction.col;
    }

    // TZD Art 4.9 free-choice: return all terminal landings (before any
    // mandatory-continuation square) plus all extended chains from the first
    // mandatory-continuation square. Landings beyond that point are excluded.
    return [...terminalCaptures, ...extendedCaptures];
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
