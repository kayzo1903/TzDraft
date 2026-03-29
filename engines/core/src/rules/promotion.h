#ifndef RULES_PROMOTION_H
#define RULES_PROMOTION_H

#include "core/types.h"

// Returns true if the given square is a promotion square for the given side.
// side: 0=white (promotes on row 7, squares 0-3), 1=black (promotes on row 0, squares 28-31)
bool isPromotionSquare(int sq, int side);

// Returns true if the piece should promote at the given square
// (accounts for whether it's a man, not already a king)
bool shouldPromote(int sq, int side, bool isKing);

#endif // RULES_PROMOTION_H
