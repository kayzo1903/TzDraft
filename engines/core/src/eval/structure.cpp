#include "eval/structure.h"
#include "core/square_map.h"
#include "core/bitboard.h"

// Board layout reference:
// Row 7 (black back rank):  sq 0(col1)  sq 1(col3)  sq 2(col5)  sq 3(col7)
// Row 6:                    sq 4(col0)  sq 5(col2)  sq 6(col4)  sq 7(col6)
// Row 5:                    sq 8(col1)  sq 9(col3)  sq10(col5)  sq11(col7)
// Row 4:                    sq12(col0)  sq13(col2)  sq14(col4)  sq15(col6)
// Row 3:                    sq16(col1)  sq17(col3)  sq18(col5)  sq19(col7)
// Row 2:                    sq20(col0)  sq21(col2)  sq22(col4)  sq23(col6)
// Row 1:                    sq24(col1)  sq25(col3)  sq26(col5)  sq27(col7)
// Row 0 (white back rank):  sq28(col0)  sq29(col2)  sq30(col4)  sq31(col6)

// Center squares (approximately sqs 13,14,17,18)
static const Bitboard CENTER_4 = (1U<<13)|(1U<<14)|(1U<<17)|(1U<<18);

int evalStructure(const Position& pos) {
    int score = 0;

    // --- Back-rank integrity ---
    // White back rank: sqs 28-31 (row 0)
    static const Bitboard WHITE_BACK = (1U<<28)|(1U<<29)|(1U<<30)|(1U<<31);
    // Black back rank: sqs 0-3 (row 7)
    static const Bitboard BLACK_BACK = (1U<<0)|(1U<<1)|(1U<<2)|(1U<<3);

    Bitboard wb = pos.whiteMen & WHITE_BACK;
    while (wb) { wb &= wb-1; score += 15; }
    Bitboard bb = pos.blackMen & BLACK_BACK;
    while (bb) { bb &= bb-1; score -= 15; }

    // --- Center control ---
    Bitboard wc = (pos.whiteMen | pos.whiteKings) & CENTER_4;
    while (wc) { wc &= wc-1; score += 8; }
    Bitboard bc = (pos.blackMen | pos.blackKings) & CENTER_4;
    while (bc) { bc &= bc-1; score -= 8; }

    // --- Advancement bonus for men ---
    // White men advance toward row 7 (lower sq numbers), so row_advanced = row(sq) - 0
    // Black men advance toward row 0 (higher sq numbers), so row_advanced = 7 - row(sq)
    {
        Bitboard wm = pos.whiteMen;
        while (wm) {
            int sq = bsf(wm); wm &= wm-1;
            int row = sqRow(sq);
            int advance = row; // white home row = 0, target = 7
            score += advance * 3;
        }
    }
    {
        Bitboard bm = pos.blackMen;
        while (bm) {
            int sq = bsf(bm); bm &= bm-1;
            int row = sqRow(sq);
            int advance = 7 - row; // black home row = 7, target = 0
            score -= advance * 3;
        }
    }

    // --- Isolated advanced man penalty ---
    // White man on row 5+ (row >= 5) with no friendly men directly behind
    // "behind" for white means rows below (smaller row numbers)
    {
        Bitboard wm = pos.whiteMen;
        while (wm) {
            int sq = bsf(wm); wm &= wm-1;
            int row = sqRow(sq);
            if (row >= 5) {
                int col = sqCol(sq);
                // Check if any white man is on row row-1 or row-2 on adjacent cols
                bool hasBehind = false;
                for (int r = row - 1; r >= 0 && r >= row - 2; r--) {
                    for (int dc = -1; dc <= 1; dc += 2) {
                        int c = col + dc;
                        int behindSq = rcToSq(r, c);
                        if (behindSq >= 0 && ((pos.whiteMen >> behindSq) & 1)) {
                            hasBehind = true;
                        }
                    }
                }
                if (!hasBehind) score -= 10;
            }
        }
    }
    {
        Bitboard bm = pos.blackMen;
        while (bm) {
            int sq = bsf(bm); bm &= bm-1;
            int row = sqRow(sq);
            // Black advances downward (row decreases)
            // "advanced" for black means row <= 2
            if (row <= 2) {
                int col = sqCol(sq);
                bool hasBehind = false;
                for (int r = row + 1; r <= 7 && r <= row + 2; r++) {
                    for (int dc = -1; dc <= 1; dc += 2) {
                        int c = col + dc;
                        int behindSq = rcToSq(r, c);
                        if (behindSq >= 0 && ((pos.blackMen >> behindSq) & 1)) {
                            hasBehind = true;
                        }
                    }
                }
                if (!hasBehind) score -= 10;
            }
        }
    }

    return score;
}
