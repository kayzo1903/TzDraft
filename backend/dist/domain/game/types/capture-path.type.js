"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAGONAL_DIRECTIONS = void 0;
exports.getValidDirections = getValidDirections;
exports.DIAGONAL_DIRECTIONS = [
    { row: 1, col: 1 },
    { row: 1, col: -1 },
    { row: -1, col: 1 },
    { row: -1, col: -1 },
];
function getValidDirections(piece) {
    if (piece.isKing()) {
        return exports.DIAGONAL_DIRECTIONS;
    }
    const forwardRow = piece.color === 'WHITE' ? 1 : -1;
    return [
        { row: forwardRow, col: 1 },
        { row: forwardRow, col: -1 },
    ];
}
//# sourceMappingURL=capture-path.type.js.map