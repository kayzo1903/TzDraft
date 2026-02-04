"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoveGeneratorService = void 0;
const move_entity_1 = require("../entities/move.entity");
const position_vo_1 = require("../value-objects/position.vo");
const capture_finding_service_1 = require("./capture-finding.service");
const capture_path_type_1 = require("../types/capture-path.type");
class MoveGeneratorService {
    captureFindingService;
    constructor() {
        this.captureFindingService = new capture_finding_service_1.CaptureFindingService();
    }
    generateAllMoves(game, player) {
        const moves = [];
        const captures = this.captureFindingService.findAllCaptures(game.board, player);
        if (captures.length > 0) {
            for (const capture of captures) {
                const moveNumber = game.getMoveCount() + 1;
                const notation = move_entity_1.Move.generateNotation(capture.from, capture.to, capture.capturedSquares);
                const move = new move_entity_1.Move(crypto.randomUUID(), game.id, moveNumber, player, capture.from, capture.to, capture.capturedSquares, capture.isPromotion, notation);
                moves.push(move);
            }
            return moves;
        }
        const pieces = game.board.getPiecesByColor(player);
        for (const piece of pieces) {
            const pieceMoves = this.generateSimpleMovesForPiece(game, piece);
            moves.push(...pieceMoves);
        }
        return moves;
    }
    generateMovesForPiece(game, piece) {
        const captures = this.captureFindingService.findCapturesForPiece(game.board, piece);
        if (captures.length > 0) {
            return captures.map((capture) => {
                const moveNumber = game.getMoveCount() + 1;
                const notation = move_entity_1.Move.generateNotation(capture.from, capture.to, capture.capturedSquares);
                return new move_entity_1.Move(crypto.randomUUID(), game.id, moveNumber, piece.color, capture.from, capture.to, capture.capturedSquares, capture.isPromotion, notation);
            });
        }
        return this.generateSimpleMovesForPiece(game, piece);
    }
    generateSimpleMovesForPiece(game, piece) {
        const moves = [];
        const { row, col } = piece.position.toRowCol();
        const directions = (0, capture_path_type_1.getValidDirections)(piece);
        for (const dir of directions) {
            const newRow = row + dir.row;
            const newCol = col + dir.col;
            if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) {
                continue;
            }
            if ((newRow + newCol) % 2 === 0) {
                continue;
            }
            const targetPos = position_vo_1.Position.fromRowCol(newRow, newCol);
            if (game.board.isEmpty(targetPos)) {
                const moveNumber = game.getMoveCount() + 1;
                const notation = move_entity_1.Move.generateNotation(piece.position, targetPos, []);
                const movedPiece = piece.moveTo(targetPos);
                const isPromotion = movedPiece.shouldPromote();
                const move = new move_entity_1.Move(crypto.randomUUID(), game.id, moveNumber, piece.color, piece.position, targetPos, [], isPromotion, notation);
                moves.push(move);
            }
        }
        return moves;
    }
    countLegalMoves(game, player) {
        return this.generateAllMoves(game, player).length;
    }
    isMoveLegal(game, player, from, to) {
        const allMoves = this.generateAllMoves(game, player);
        return allMoves.some((move) => move.from.equals(from) && move.to.equals(to));
    }
}
exports.MoveGeneratorService = MoveGeneratorService;
//# sourceMappingURL=move-generator.service.js.map