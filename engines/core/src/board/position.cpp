#include "core/types.h"
#include "core/constants.h"
#include "rules/repetition.h"

// Initialize position to the standard starting configuration
void initPosition(Position& pos) {
    // Black men on rows 7, 6, 5 -> indices 0-11
    pos.blackMen = 0x00000FFF;
    // White men on rows 2, 1, 0 -> indices 20-31
    pos.whiteMen = 0xFFF00000;

    pos.whiteKings = 0;
    pos.blackKings = 0;

    pos.sideToMove = 0; // 0 = White, 1 = Black
    pos.ply = 0;
    pos.fiftyMove = 0;
    pos.zobrist = 0; // Set up hash after init
}

// Check for repetition using the hash history
bool isRepetition(const Position& pos) {
    return isRepetitionHash(pos.zobrist, 3);
}
