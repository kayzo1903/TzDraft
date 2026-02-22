"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRulesService = void 0;
const position_vo_1 = require("../value-objects/position.vo");
const board_state_vo_1 = require("../value-objects/board-state.vo");
const game_constants_1 = require("../../../shared/constants/game.constants");
const capture_finding_service_1 = require("./capture-finding.service");
class GameRulesService {
    captureFindingService;
    constructor() {
        this.captureFindingService = new capture_finding_service_1.CaptureFindingService();
    }
    togglePlayer(player) {
        return player === game_constants_1.PlayerColor.WHITE ? game_constants_1.PlayerColor.BLACK : game_constants_1.PlayerColor.WHITE;
    }
    getPositionKey(board, playerToMove) {
        const pieces = board
            .getAllPieces()
            .sort((a, b) => a.position.value - b.position.value)
            .map((piece) => `${piece.position.value}${piece.color[0]}${piece.isKing() ? 'K' : 'M'}`)
            .join('');
        return `${playerToMove}|${pieces}`;
    }
    getMaterialCounts(board) {
        const counts = {
            whiteMen: 0,
            whiteKings: 0,
            blackMen: 0,
            blackKings: 0,
        };
        for (const piece of board.getAllPieces()) {
            if (piece.color === game_constants_1.PlayerColor.WHITE) {
                if (piece.isKing())
                    counts.whiteKings += 1;
                else
                    counts.whiteMen += 1;
            }
            else if (piece.isKing()) {
                counts.blackKings += 1;
            }
            else {
                counts.blackMen += 1;
            }
        }
        return counts;
    }
    getEndgameTypeFromCounts(counts) {
        const totalPieces = counts.whiteMen + counts.whiteKings + counts.blackMen + counts.blackKings;
        if (totalPieces === 2 &&
            counts.whiteKings === 1 &&
            counts.blackKings === 1 &&
            counts.whiteMen === 0 &&
            counts.blackMen === 0) {
            return 'KvsK';
        }
        if (totalPieces === 3) {
            const whiteKManVsBlackK = counts.whiteKings === 1 &&
                counts.whiteMen === 1 &&
                counts.blackKings === 1 &&
                counts.blackMen === 0;
            const blackKManVsWhiteK = counts.blackKings === 1 &&
                counts.blackMen === 1 &&
                counts.whiteKings === 1 &&
                counts.whiteMen === 0;
            if (whiteKManVsBlackK || blackKManVsWhiteK)
                return 'KManVsK';
        }
        if (totalPieces === 3) {
            const whiteTwoKingsVsBlackKing = counts.whiteKings === 2 &&
                counts.whiteMen === 0 &&
                counts.blackKings === 1 &&
                counts.blackMen === 0;
            const blackTwoKingsVsWhiteKing = counts.blackKings === 2 &&
                counts.blackMen === 0 &&
                counts.whiteKings === 1 &&
                counts.whiteMen === 0;
            if (whiteTwoKingsVsBlackKing || blackTwoKingsVsWhiteKing)
                return 'KKvsK';
        }
        return null;
    }
    getEndgameStrongerSide(counts, endgameType) {
        if (endgameType === 'KvsK')
            return null;
        const whiteMaterial = counts.whiteMen + counts.whiteKings;
        const blackMaterial = counts.blackMen + counts.blackKings;
        if (whiteMaterial > blackMaterial)
            return game_constants_1.PlayerColor.WHITE;
        if (blackMaterial > whiteMaterial)
            return game_constants_1.PlayerColor.BLACK;
        return null;
    }
    getThreeKingsStrongerSide(counts) {
        const onlyKings = counts.whiteMen === 0 && counts.blackMen === 0;
        if (!onlyKings)
            return null;
        if (counts.whiteKings >= 3 && counts.blackKings === 1)
            return game_constants_1.PlayerColor.WHITE;
        if (counts.blackKings >= 3 && counts.whiteKings === 1)
            return game_constants_1.PlayerColor.BLACK;
        return null;
    }
    applyMoveToBoard(board, move) {
        let nextBoard = board;
        for (const capturedPos of move.capturedSquares) {
            nextBoard = nextBoard.removePiece(capturedPos);
        }
        nextBoard = nextBoard.movePiece(move.from, move.to);
        return nextBoard;
    }
    analyzeDrawRules(game) {
        const repetition = new Map();
        let board = board_state_vo_1.BoardState.createInitialBoard();
        let playerToMove = game_constants_1.PlayerColor.WHITE;
        const startKey = this.getPositionKey(board, playerToMove);
        repetition.set(startKey, 1);
        let kingOnlyNonCapturePly = 0;
        let article84Type = null;
        let article84Stronger = null;
        let article84StrongerMoves = 0;
        let article85Stronger = null;
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
            }
            else {
                const stronger = this.getEndgameStrongerSide(counts, endgameType);
                const isSameTrackingState = article84Type === endgameType && article84Stronger === stronger;
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
            }
            else {
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
        const drawByArticle84 = !!article84Type && article84StrongerMoves >= article84MoveLimit;
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
    evaluatePostMove(game) {
        const currentPlayerPieces = game.board.getPiecesByColor(game.currentTurn);
        if (currentPlayerPieces.length === 0) {
            return {
                outcome: {
                    winner: game.currentTurn === game_constants_1.PlayerColor.WHITE ? game_constants_1.Winner.BLACK : game_constants_1.Winner.WHITE,
                    reason: game_constants_1.EndReason.CHECKMATE,
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
                    winner: game.currentTurn === game_constants_1.PlayerColor.WHITE ? game_constants_1.Winner.BLACK : game_constants_1.Winner.WHITE,
                    reason: game_constants_1.EndReason.CHECKMATE,
                    noMoves: true,
                },
                drawClaimAvailable: {
                    threefoldRepetition: false,
                    thirtyMoveRule: false,
                },
            };
        }
        const drawAnalysis = this.analyzeDrawRules(game);
        if (drawAnalysis.drawByArticle84 ||
            drawAnalysis.drawByArticle85 ||
            drawAnalysis.drawByThreefoldRepetition ||
            drawAnalysis.drawByThirtyMoveRule) {
            return {
                outcome: {
                    winner: game_constants_1.Winner.DRAW,
                    reason: game_constants_1.EndReason.DRAW,
                },
                drawClaimAvailable: drawAnalysis.drawClaimAvailable,
            };
        }
        return {
            outcome: null,
            drawClaimAvailable: drawAnalysis.drawClaimAvailable,
        };
    }
    isTimeoutDrawByInsufficientMaterial(board, winnerColor) {
        const counts = this.getMaterialCounts(board);
        if (winnerColor === game_constants_1.PlayerColor.WHITE) {
            if (counts.whiteKings === 1 &&
                counts.whiteMen === 0 &&
                counts.blackKings === 1 &&
                counts.blackMen === 0) {
                return true;
            }
            if (counts.whiteKings === 1 &&
                counts.whiteMen === 1 &&
                counts.blackKings === 1 &&
                counts.blackMen === 0) {
                return true;
            }
            if (counts.whiteKings === 2 &&
                counts.whiteMen === 0 &&
                counts.blackKings === 1 &&
                counts.blackMen === 0) {
                return true;
            }
            return false;
        }
        if (counts.blackKings === 1 &&
            counts.blackMen === 0 &&
            counts.whiteKings === 1 &&
            counts.whiteMen === 0) {
            return true;
        }
        if (counts.blackKings === 1 &&
            counts.blackMen === 1 &&
            counts.whiteKings === 1 &&
            counts.whiteMen === 0) {
            return true;
        }
        if (counts.blackKings === 2 &&
            counts.blackMen === 0 &&
            counts.whiteKings === 1 &&
            counts.whiteMen === 0) {
            return true;
        }
        return false;
    }
    shouldPromote(piece, position) {
        if (piece.isKing()) {
            return false;
        }
        const { row } = position.toRowCol();
        if (piece.color === game_constants_1.PlayerColor.WHITE && row === 7) {
            return true;
        }
        if (piece.color === game_constants_1.PlayerColor.BLACK && row === 0) {
            return true;
        }
        return false;
    }
    promotePiece(piece) {
        if (piece.isKing()) {
            return piece;
        }
        return piece.promote();
    }
    isGameOver(game) {
        if (game.isGameOver()) {
            return true;
        }
        const currentPlayerPieces = game.board.getPiecesByColor(game.currentTurn);
        if (currentPlayerPieces.length === 0) {
            return true;
        }
        if (!this.hasLegalMoves(game, game.currentTurn)) {
            return true;
        }
        return false;
    }
    detectWinner(game) {
        const whitePieces = game.board.getPiecesByColor(game_constants_1.PlayerColor.WHITE);
        const blackPieces = game.board.getPiecesByColor(game_constants_1.PlayerColor.BLACK);
        if (whitePieces.length === 0) {
            return game_constants_1.Winner.BLACK;
        }
        if (blackPieces.length === 0) {
            return game_constants_1.Winner.WHITE;
        }
        const whiteHasMoves = this.hasLegalMoves(game, game_constants_1.PlayerColor.WHITE);
        const blackHasMoves = this.hasLegalMoves(game, game_constants_1.PlayerColor.BLACK);
        if (!whiteHasMoves && game.currentTurn === game_constants_1.PlayerColor.WHITE) {
            return game_constants_1.Winner.BLACK;
        }
        if (!blackHasMoves && game.currentTurn === game_constants_1.PlayerColor.BLACK) {
            return game_constants_1.Winner.WHITE;
        }
        return null;
    }
    hasLegalMoves(game, player) {
        const captures = this.captureFindingService.findAllCaptures(game.board, player);
        if (captures.length > 0) {
            return true;
        }
        const pieces = game.board.getPiecesByColor(player);
        for (const piece of pieces) {
            if (this.hasSimpleMovesForPiece(game.board, piece)) {
                return true;
            }
        }
        return false;
    }
    hasSimpleMovesForPiece(board, piece) {
        const { row, col } = piece.position.toRowCol();
        const directions = piece.isKing()
            ? [
                { row: 1, col: 1 },
                { row: 1, col: -1 },
                { row: -1, col: 1 },
                { row: -1, col: -1 },
            ]
            : piece.color === game_constants_1.PlayerColor.WHITE
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
            if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) {
                continue;
            }
            if ((newRow + newCol) % 2 === 0) {
                continue;
            }
            const targetPos = position_vo_1.Position.fromRowCol(newRow, newCol);
            if (board.isEmpty(targetPos)) {
                return true;
            }
        }
        return false;
    }
    isDrawByInsufficientMaterial(board) {
        const whitePieces = board.getPiecesByColor(game_constants_1.PlayerColor.WHITE);
        const blackPieces = board.getPiecesByColor(game_constants_1.PlayerColor.BLACK);
        if (whitePieces.length === 1 &&
            blackPieces.length === 1 &&
            whitePieces[0].isKing() &&
            blackPieces[0].isKing()) {
            return true;
        }
        return false;
    }
    endGame(game, winner, reason) {
        game.endGame(winner, reason);
    }
    countPieces(board, player) {
        return board.countPieces(player);
    }
}
exports.GameRulesService = GameRulesService;
//# sourceMappingURL=game-rules.service.js.map