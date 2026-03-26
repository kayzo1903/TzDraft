#include "rules/promotion.h"
#include "core/constants.h"

bool isPromotionSquare(int sq, int side) {
    if (side == 0) {
        // White promotes on row 7 (squares 0-3)
        return (PROMOTION_MASK_WHITE >> sq) & 1;
    } else {
        // Black promotes on row 0 (squares 28-31)
        return (PROMOTION_MASK_BLACK >> sq) & 1;
    }
}

bool shouldPromote(int sq, int side, bool isKing) {
    if (isKing) return false;
    return isPromotionSquare(sq, side);
}
