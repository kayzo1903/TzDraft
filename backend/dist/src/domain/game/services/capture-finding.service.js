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
            const capturePaths = piece.isKing()
                ? this.findKingCaptureInDirection(board, piece, direction, [], [])
                : this.findManCaptureInDirection(board, piece, direction, [], []);
            captures.push(...capturePaths);
        }
        return captures;
    }
    findManCaptureInDirection(board, piece, direction, currentPath, capturedSoFar, originFrom = piece.position, originPiece = piece) {
        const { row, col } = piece.position.toRowCol();
        const opponentColor = piece.color === game_constants_1.PlayerColor.WHITE ? game_constants_1.PlayerColor.BLACK : game_constants_1.PlayerColor.WHITE;
        const adjacentRow = row + direction.row;
        const adjacentCol = col + direction.col;
        if (adjacentRow < 0 || adjacentRow > 7 || adjacentCol < 0 || adjacentCol > 7)
            return [];
        if ((adjacentRow + adjacentCol) % 2 === 0)
            return [];
        const adjacentPos = position_vo_1.Position.fromRowCol(adjacentRow, adjacentCol);
        const adjacentPiece = board.getPieceAt(adjacentPos);
        if (!adjacentPiece || adjacentPiece.color !== opponentColor)
            return [];
        if (capturedSoFar.some((p) => p.equals(adjacentPos)))
            return [];
        const landingRow = adjacentRow + direction.row;
        const landingCol = adjacentCol + direction.col;
        if (landingRow < 0 || landingRow > 7 || landingCol < 0 || landingCol > 7)
            return [];
        if ((landingRow + landingCol) % 2 === 0)
            return [];
        const landingPos = position_vo_1.Position.fromRowCol(landingRow, landingCol);
        if (board.isOccupied(landingPos))
            return [];
        const newPath = [...currentPath, landingPos];
        const newCaptured = [...capturedSoFar, adjacentPos];
        const movedPiece = piece.moveTo(landingPos);
        const shouldPromote = movedPiece.shouldPromote();
        const finalPiece = shouldPromote ? movedPiece.promote() : movedPiece;
        let tempBoard = board.removePiece(adjacentPos);
        tempBoard = tempBoard.removePiece(piece.position);
        tempBoard = tempBoard.placePiece(finalPiece);
        const currentEndpoint = {
            piece: originPiece,
            from: originFrom,
            path: newPath,
            capturedSquares: newCaptured,
            to: landingPos,
            isPromotion: shouldPromote,
        };
        if (shouldPromote) {
            return [currentEndpoint];
        }
        const furtherCaptures = [];
        const nextDirections = (0, capture_path_type_1.getValidDirections)(finalPiece);
        for (const nextDir of nextDirections) {
            const morePaths = this.findManCaptureInDirection(tempBoard, finalPiece, nextDir, newPath, newCaptured, originFrom, originPiece);
            furtherCaptures.push(...morePaths);
        }
        if (furtherCaptures.length === 0) {
            return [currentEndpoint];
        }
        return furtherCaptures;
    }
    findKingCaptureInDirection(board, piece, direction, currentPath, capturedSoFar, originFrom = piece.position, originPiece = piece) {
        const { row, col } = piece.position.toRowCol();
        const opponentColor = piece.color === game_constants_1.PlayerColor.WHITE ? game_constants_1.PlayerColor.BLACK : game_constants_1.PlayerColor.WHITE;
        let r = row + direction.row;
        let c = col + direction.col;
        let opponentPos = null;
        const terminalCaptures = [];
        const extendedCaptures = [];
        while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
            const pos = position_vo_1.Position.fromRowCol(r, c);
            const occupant = board.getPieceAt(pos);
            if (occupant) {
                if (opponentPos)
                    break;
                if (occupant.color !== opponentColor)
                    break;
                if (capturedSoFar.some((p) => p.equals(pos)))
                    break;
                opponentPos = pos;
            }
            else if (opponentPos) {
                const landingPos = pos;
                const newPath = [...currentPath, landingPos];
                const newCaptured = [...capturedSoFar, opponentPos];
                const movedPiece = piece.moveTo(landingPos);
                let tempBoard = board.removePiece(piece.position);
                tempBoard = tempBoard.removePiece(opponentPos);
                tempBoard = tempBoard.placePiece(movedPiece);
                const furtherCaptures = [];
                const nextDirections = (0, capture_path_type_1.getValidDirections)(movedPiece);
                for (const nextDir of nextDirections) {
                    const morePaths = this.findKingCaptureInDirection(tempBoard, movedPiece, nextDir, newPath, newCaptured, originFrom, originPiece);
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
                }
                else {
                    extendedCaptures.push(...furtherCaptures);
                    break;
                }
            }
            r += direction.row;
            c += direction.col;
        }
        return [...terminalCaptures, ...extendedCaptures];
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