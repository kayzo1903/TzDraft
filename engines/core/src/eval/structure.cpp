#include "eval/structure.h"
#include "core/square_map.h"
#include "core/bitboard.h"

constexpr int CENTER_CTRL_BONUS  = 8;   // cp per piece on center 4 — Texel-tunable
constexpr int ADVANCE_BONUS      = 8;   // cp per rank advanced
constexpr int ISOLATION_PENALTY  = 10;  // cp per isolated advanced man

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

    // --- Center control ---
    Bitboard wc = (pos.whiteMen | pos.whiteKings) & CENTER_4;
    while (wc) { wc &= wc-1; score += CENTER_CTRL_BONUS; }
    Bitboard bc = (pos.blackMen | pos.blackKings) & CENTER_4;
    while (bc) { bc &= bc-1; score -= CENTER_CTRL_BONUS; }

    // --- Advancement bonus for men ---
    // White men advance toward row 7 (lower sq numbers), so row_advanced = row(sq) - 0
    // Black men advance toward row 0 (higher sq numbers), so row_advanced = 7 - row(sq)
    {
        Bitboard wm = pos.whiteMen;
        while (wm) {
            int sq = bsf(wm); wm &= wm-1;
            int row = sqRow(sq);
            int advance = row; // white home row = 0, target = 7
            score += advance * ADVANCE_BONUS;
        }
    }
    {
        Bitboard bm = pos.blackMen;
        while (bm) {
            int sq = bsf(bm); bm &= bm-1;
            int row = sqRow(sq);
            int advance = 7 - row; // black home row = 7, target = 0
            score -= advance * ADVANCE_BONUS;
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
                if (!hasBehind) score -= ISOLATION_PENALTY;
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
                if (!hasBehind) score += ISOLATION_PENALTY;  // bad for black = good for white
            }
        }
    }

    return score;
}
