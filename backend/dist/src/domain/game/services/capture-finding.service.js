"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaptureFindingService = void 0;
const position_vo_1 = require("../value-objects/position.vo");
const game_constants_1 = require("../../../shared/constants/game.constants");
const capture_path_type_1 = require("../types/capture-path.type");
class CaptureFindingService {
    findAllCaptures(board, player) {
        const allCaptures = [];
        const playerPieces = board.getPiecesByColor(player);
        for (const piece of playerPieces) {
            const captures = this.findCapturesForPiece(board, piece);
            allCaptures.push(...captures);
        }
        return allCaptures;
    }
    findCapturesForPiece(board, piece) {
        const captures = [];
        const directions = (0, capture_path_type_1.getValidDirections)(piece);
        for (const direction of directions) {
            const capturePaths = this.findCaptureInDirection(board, piece, direction, [], []);
            captures.push(...capturePaths);
        }
        return captures;
    }
    findCaptureInDirection(board, piece, direction, currentPath, capturedSoFar) {
        const { row, col } = piece.position.toRowCol();
        const opponentColor = piece.color === game_constants_1.PlayerColor.WHITE ? game_constants_1.PlayerColor.BLACK : game_constants_1.PlayerColor.WHITE;
        const adjacentRow = row + direction.row;
        const adjacentCol = col + direction.col;
        if (adjacentRow < 0 ||
            adjacentRow > 7 ||
            adjacentCol < 0 ||
            adjacentCol > 7) {
            return [];
        }
        if ((adjacentRow + adjacentCol) % 2 === 0) {
            return [];
        }
        const adjacentPos = position_vo_1.Position.fromRowCol(adjacentRow, adjacentCol);
        const adjacentPiece = board.getPieceAt(adjacentPos);
        if (!adjacentPiece || adjacentPiece.color !== opponentColor) {
            return [];
        }
        if (capturedSoFar.some((p) => p.equals(adjacentPos))) {
            return [];
        }
        const landingRow = adjacentRow + direction.row;
        const landingCol = adjacentCol + direction.col;
        if (landingRow < 0 || landingRow > 7 || landingCol < 0 || landingCol > 7) {
            return [];
        }
        if ((landingRow + landingCol) % 2 === 0) {
            return [];
        }
        const landingPos = position_vo_1.Position.fromRowCol(landingRow, landingCol);
        if (board.isOccupied(landingPos)) {
            return [];
        }
        const newPath = [...currentPath, landingPos];
        const newCaptured = [...capturedSoFar, adjacentPos];
        let tempBoard = board.removePiece(adjacentPos);
        const movedPiece = piece.moveTo(landingPos);
        const shouldPromote = movedPiece.shouldPromote();
        const finalPiece = shouldPromote ? movedPiece.promote() : movedPiece;
        tempBoard = tempBoard.removePiece(piece.position);
        tempBoard = tempBoard.placePiece(finalPiece);
        const furtherCaptures = [];
        const nextDirections = (0, capture_path_type_1.getValidDirections)(finalPiece);
        for (const nextDir of nextDirections) {
            const morePaths = this.findCaptureInDirection(tempBoard, finalPiece, nextDir, newPath, newCaptured);
            furtherCaptures.push(...morePaths);
        }
        if (furtherCaptures.length === 0) {
            return [
                {
                    piece,
                    from: piece.position,
                    path: newPath,
                    capturedSquares: newCaptured,
                    to: landingPos,
                    isPromotion: shouldPromote,
                },
            ];
        }
        return furtherCaptures;
    }
    isValidCapture(board, piece, to, capturedSquares) {
        const allCaptures = this.findCapturesForPiece(board, piece);
        return allCaptures.some((capture) => capture.to.equals(to) &&
            capture.capturedSquares.length === capturedSquares.length &&
            capture.capturedSquares.every((cs, i) => cs.equals(capturedSquares[i])));
    }
    hasCapturesAvailable(board, player) {
        return this.findAllCaptures(board, player).length > 0;
    }
}
exports.CaptureFindingService = CaptureFindingService;
//# sourceMappingURL=capture-finding.service.js.map