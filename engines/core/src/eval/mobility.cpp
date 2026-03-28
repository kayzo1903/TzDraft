#include "eval/mobility.h"
#include "core/bitboard.h"
#include "core/constants.h"
#include "core/square_map.h"

constexpr int MAN_MOBILITY_SCALE  = 5;  // cp per open forward direction for men
constexpr int KING_MOBILITY_SCALE = 2;  // cp per reachable square for kings (sliding)

// Count squares a king can reach sliding in direction (dr,dc) from sq.
// Stops at first occupied square (cannot jump over in quiet moves).
static int kingSlide(int sq, int dr, int dc, Bitboard occupied) {
    int row = sqRow(sq);
    int col = sqCol(sq);
    int count = 0;
    for (int step = 1; step <= 7; step++) {
        int dest = rcToSq(row + dr * step, col + dc * step);
        if (dest < 0) break;
        if ((occupied >> dest) & 1) break;
        count++;
    }
    return count;
}

int evalMobility(const Position& pos, const RuleConfig& /*rules*/) {
    Bitboard occupied = (pos.whiteMen | pos.whiteKings | pos.blackMen | pos.blackKings) & 0xFFFFFFFF;
    Bitboard empty = ~occupied & 0xFFFFFFFF;
    int white = 0, black = 0;
    int whiteKing = 0, blackKing = 0;

    // White men advance NE / NW
    Bitboard wm = pos.whiteMen;
    while (wm) {
        int sq = bsf(wm); wm &= wm - 1;
        if (NE_MASK[sq] && ((empty >> bsf(NE_MASK[sq])) & 1)) white++;
        if (NW_MASK[sq] && ((empty >> bsf(NW_MASK[sq])) & 1)) white++;
    }
    // Black men advance SE / SW
    Bitboard bm = pos.blackMen;
    while (bm) {
        int sq = bsf(bm); bm &= bm - 1;
        if (SE_MASK[sq] && ((empty >> bsf(SE_MASK[sq])) & 1)) black++;
        if (SW_MASK[sq] && ((empty >> bsf(SW_MASK[sq])) & 1)) black++;
    }
    // Kings: count all reachable squares along each diagonal (flying king slide)
    Bitboard wk = pos.whiteKings;
    while (wk) {
        int sq = bsf(wk); wk &= wk - 1;
        whiteKing += kingSlide(sq,  1,  1, occupied);
        whiteKing += kingSlide(sq,  1, -1, occupied);
        whiteKing += kingSlide(sq, -1,  1, occupied);
        whiteKing += kingSlide(sq, -1, -1, occupied);
    }
    Bitboard bk = pos.blackKings;
    while (bk) {
        int sq = bsf(bk); bk &= bk - 1;
        blackKing += kingSlide(sq,  1,  1, occupied);
        blackKing += kingSlide(sq,  1, -1, occupied);
        blackKing += kingSlide(sq, -1,  1, occupied);
        blackKing += kingSlide(sq, -1, -1, occupied);
    }

    return (white - black) * MAN_MOBILITY_SCALE
         + (whiteKing - blackKing) * KING_MOBILITY_SCALE;
}
