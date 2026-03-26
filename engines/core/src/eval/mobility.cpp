#include "eval/mobility.h"
#include "core/bitboard.h"
#include "core/constants.h"

constexpr int MOBILITY_SCALE = 3;  // cp per mobility unit — Texel-tunable

// Cheap bitboard mobility: count forward-open squares for each piece instead
// of generating a full move list. No allocations, no Position copies.
int evalMobility(const Position& pos, const RuleConfig& /*rules*/) {
    Bitboard empty = ~(pos.whiteMen | pos.whiteKings | pos.blackMen | pos.blackKings) & 0xFFFFFFFF;
    int white = 0, black = 0;

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
    // Kings: all four directions
    Bitboard wk = pos.whiteKings;
    while (wk) {
        int sq = bsf(wk); wk &= wk - 1;
        if (NE_MASK[sq] && ((empty >> bsf(NE_MASK[sq])) & 1)) white++;
        if (NW_MASK[sq] && ((empty >> bsf(NW_MASK[sq])) & 1)) white++;
        if (SE_MASK[sq] && ((empty >> bsf(SE_MASK[sq])) & 1)) white++;
        if (SW_MASK[sq] && ((empty >> bsf(SW_MASK[sq])) & 1)) white++;
    }
    Bitboard bk = pos.blackKings;
    while (bk) {
        int sq = bsf(bk); bk &= bk - 1;
        if (NE_MASK[sq] && ((empty >> bsf(NE_MASK[sq])) & 1)) black++;
        if (NW_MASK[sq] && ((empty >> bsf(NW_MASK[sq])) & 1)) black++;
        if (SE_MASK[sq] && ((empty >> bsf(SE_MASK[sq])) & 1)) black++;
        if (SW_MASK[sq] && ((empty >> bsf(SW_MASK[sq])) & 1)) black++;
    }

    return (white - black) * MOBILITY_SCALE;
}
