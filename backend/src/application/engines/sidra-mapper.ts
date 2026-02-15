import {
  SidraMoveRequest,
  SidraMoveResponse,
  SidraPayload,
} from './sidra-types';

export class SidraBoardMapper {
  /**
   * Converts a Cake Engine request (1-32, Top-Left) to a SiDra payload (1-32, Bottom-Left).
   */
  static toSidraRequest(request: SidraMoveRequest): SidraPayload {
    const transformedPieces = request.pieces.map((p) => ({
      ...p,
      position: 33 - p.position,
    }));

    return {
      pieces: transformedPieces,
      currentPlayer: request.currentPlayer,
      moveCount: request.moveCount,
      timeLimitMs: request.timeLimitMs,
    };
  }

  /**
   * Converts a SiDra response back to Cake Engine coordinates.
   * Includes Geometric Capture Inference to detect captures omitted by SiDra CLI.
   */
  static fromSidraResponse(
    parsed: SidraMoveResponse,
    originalRequest: SidraMoveRequest,
  ): SidraMoveResponse {
    // Basic transformation: 33 - pos
    const result: SidraMoveResponse = {
      from: 33 - parsed.from,
      to: 33 - parsed.to,
      capturedSquares: parsed.capturedSquares.map((s) => 33 - s),
      isPromotion: parsed.isPromotion,
    };

    // Multi-Capture Pathfinding
    // If SiDra didn't report captures (or we want to verify), we infer them.
    // We use DFS to find a valid capture path from 'from' to 'to'.
    if (
      result.capturedSquares.length === 0 &&
      result.from !== result.to &&
      result.from > 0 &&
      result.to > 0
    ) {
      const path = this.findCapturePath(
        result.from,
        result.to,
        originalRequest.pieces,
        originalRequest.currentPlayer,
      );
      if (path.length > 0) {
        result.capturedSquares = path;
      }
    }

    return result;
  }

  /**
   * Finds a capture path from startPos to endPos using DFS.
   * Returns an array of captured square IDs.
   */
  private static findCapturePath(
    startPos: number,
    endPos: number,
    pieces: SidraPayload['pieces'],
    playerColor: 'WHITE' | 'BLACK',
  ): number[] {
    // Convert pieces to a Map for O(1) lookup
    const board = new Map<
      number,
      { color: 'WHITE' | 'BLACK'; type: 'MAN' | 'KING' }
    >();
    pieces.forEach((p) => board.set(p.position, p));

    const startPiece = board.get(startPos);
    if (!startPiece) return [];

    // Stack for DFS: [currentPos, capturedSoFar[]]
    const stack: { pos: number; captured: number[] }[] = [];
    stack.push({ pos: startPos, captured: [] });

    let foundPath: number[] | null = null;

    while (stack.length > 0) {
      const { pos, captured } = stack.pop()!;

      // If we reached the target and captured something, this is a candidate path
      if (pos === endPos && captured.length > 0) {
        foundPath = captured;
        break;
      }

      // TZD rule: promotion ends a capture sequence immediately for men.
      if (
        startPiece.type === 'MAN' &&
        captured.length > 0 &&
        this.isPromotionSquare(pos, playerColor)
      ) {
        continue;
      }

      // Generate valid jumps from 'pos' using the moving piece's identity
      const jumps = this.getLegalJumps(
        pos,
        startPiece, // Pass the piece that is moving!
        board,
        playerColor,
        captured,
      );

      for (const jump of jumps) {
        // Avoid cycles or re-capturing same piece (not allowed in one turn)
        if (!captured.includes(jump.capturedPiece)) {
          stack.push({
            pos: jump.landingPos,
            captured: [...captured, jump.capturedPiece],
          });
        }
      }
    }

    return foundPath ?? [];
  }

  /**
   * Generates legal jumps from a specific position.
   */
  private static getLegalJumps(
    fromPos: number,
    movingPiece: { color: 'WHITE' | 'BLACK'; type: 'MAN' | 'KING' },
    board: Map<number, { color: 'WHITE' | 'BLACK'; type: 'MAN' | 'KING' }>,
    playerColor: 'WHITE' | 'BLACK',
    ignoredPieces: number[],
  ): { landingPos: number; capturedPiece: number }[] {
    // piece comes from arguments, not board lookup!

    if (movingPiece.type === 'KING') {
      return this.getKingJumps(
        fromPos,
        movingPiece,
        board,
        playerColor,
        ignoredPieces,
      );
    } else {
      return this.getManJumps(
        fromPos,
        movingPiece,
        board,
        playerColor,
        ignoredPieces,
      );
    }
  }

  private static getManJumps(
    fromPos: number,
    movingPiece: { color: 'WHITE' | 'BLACK'; type: 'MAN' | 'KING' },
    board: Map<number, { color: 'WHITE' | 'BLACK'; type: 'MAN' | 'KING' }>,
    playerColor: 'WHITE' | 'BLACK',
    ignoredPieces: number[],
  ): { landingPos: number; capturedPiece: number }[] {
    const jumps: { landingPos: number; capturedPiece: number }[] = [];
    const { row, col } = this.getRowCol(fromPos);

    // TZD rule: men capture forward only (never backward).
    const forward = playerColor === 'WHITE' ? 1 : -1;
    const directions = [
      { r: forward, c: -1 },
      { r: forward, c: 1 },
    ];

    for (const d of directions) {
      const capRow = row + d.r;
      const capCol = col + d.c;
      const landRow = row + d.r * 2;
      const landCol = col + d.c * 2;

      const capPos = this.positionFromRowCol(capRow, capCol);
      const landPos = this.positionFromRowCol(landRow, landCol);

      if (capPos && landPos) {
        const capPiece = board.get(capPos);
        const landPiece = board.get(landPos);

        const isValidCap =
          capPiece &&
          capPiece.color !== playerColor &&
          !ignoredPieces.includes(capPos);

        let isLandingEmpty = !landPiece;

        if (landPiece && ignoredPieces.includes(landPos)) {
          isLandingEmpty = true;
        }

        if (isValidCap && isLandingEmpty) {
          jumps.push({ landingPos: landPos, capturedPiece: capPos });
        }
      }
    }
    return jumps;
  }

  private static getKingJumps(
    fromPos: number,
    movingPiece: { color: 'WHITE' | 'BLACK'; type: 'MAN' | 'KING' },
    board: Map<number, { color: 'WHITE' | 'BLACK'; type: 'MAN' | 'KING' }>,
    playerColor: 'WHITE' | 'BLACK',
    ignoredPieces: number[],
  ): { landingPos: number; capturedPiece: number }[] {
    const jumps: { landingPos: number; capturedPiece: number }[] = [];
    const { row, col } = this.getRowCol(fromPos);

    const directions = [
      { r: -1, c: -1 },
      { r: -1, c: 1 },
      { r: 1, c: -1 },
      { r: 1, c: 1 },
    ];

    for (const d of directions) {
      let r = row + d.r;
      let c = col + d.c;
      let foundOpponent = false;
      let capturedPos = -1;

      while (true) {
        const pos = this.positionFromRowCol(r, c);
        if (!pos) break; // Off board

        const piece = board.get(pos);

        // If we previously found an opponent, we are now looking for empty squares to land
        if (foundOpponent) {
          // Check obstruction
          if (piece && !ignoredPieces.includes(pos)) {
            // Hit obstacle (friendly or uncaptured opponent)
            break;
          } else {
            // Empty square (or previously captured piece) -> Valid landing
            if (!piece) {
              jumps.push({ landingPos: pos, capturedPiece: capturedPos });
            }
          }
        } else {
          // Still looking for opponent
          if (piece) {
            if (piece.color === playerColor) {
              break; // Blocked by friendly
            } else if (ignoredPieces.includes(pos)) {
              break;
            } else {
              // Found active opponent
              foundOpponent = true;
              capturedPos = pos;
            }
          }
        }

        r += d.r;
        c += d.c;
      }
    }
    return jumps;
  }

  // Helper: Convert 1-32 to Row/Col (0-7, 0-7)
  private static getRowCol(val: number): { row: number; col: number } {
    const row = Math.floor((val - 1) / 4);
    const col = ((val - 1) % 4) * 2 + ((row + 1) % 2);
    return { row, col };
  }

  // Helper: Convert Row/Col back to 1-32
  private static positionFromRowCol(row: number, col: number): number | null {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    if ((row + col) % 2 === 0) return null;
    return row * 4 + Math.floor(col / 2) + 1;
  }

  private static isPromotionSquare(
    pos: number,
    playerColor: 'WHITE' | 'BLACK',
  ): boolean {
    const { row } = this.getRowCol(pos);
    // Cake-engine convention: White moves down and promotes on row 7; Black promotes on row 0.
    return playerColor === 'WHITE' ? row === 7 : row === 0;
  }
}
