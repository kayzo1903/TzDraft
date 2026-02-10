/**
 * Predefined diagonal directions
 */
export const DIAGONAL_DIRECTIONS = [
    { row: 1, col: 1 }, // Forward-right
    { row: 1, col: -1 }, // Forward-left
    { row: -1, col: 1 }, // Backward-right
    { row: -1, col: -1 }, // Backward-left
];
/**
 * Get valid directions for a piece
 */
export function getValidDirections(piece) {
    if (piece.isKing()) {
        // Kings can move in all 4 diagonal directions
        return DIAGONAL_DIRECTIONS;
    }
    // Men can only move forward
    const forwardRow = piece.color === 'WHITE' ? 1 : -1;
    return [
        { row: forwardRow, col: 1 },
        { row: forwardRow, col: -1 },
    ];
}
