#include "eval/structure.h"
#include "core/square_map.h"
#include "core/bitboard.h"
#include "core/constants.h"
#include "board/position.h"

constexpr int CENTER_CTRL_BONUS  = 7;   // cp per piece on center 4
constexpr int ISOLATION_PENALTY  = 10;  // cp per isolated advanced man
constexpr int SUPPORT_BONUS      = 6;   // cp per man with a friendly supporter diagonally behind
constexpr int EXCHANGE_BONUS     = 5;   // cp per piece off the board when materially ahead (≥2)

// Center squares
static const Bitboard CENTER_4 = (1U<<13)|(1U<<14)|(1U<<17)|(1U<<18);

// Piece-Square Table for Men — peaks at the centre diagonal zone (rows 3-5),
// not a flat advancement ramp.  Home rank has a small positive value so the
// engine doesn't abandon it carelessly.
// White: home at row 0 (sqs 28-31), target at row 7 (sqs 0-3)
static const int PST_MEN[32] = {
     11,  13,  13,  11,
     10,  12,  12,  10,
      7,  11,  11,   7,
      6,  10,  10,   6,
      4,   7,   7,   4,
      3,   5,   5,   3,
      2,   3,   3,   2,
      2,   2,   2,   2,
};

// Piece-Square Table for Kings — symmetric, peaks at centre.
// Kings are most powerful in the centre where they control all 4 diagonals.
// Edge/corner squares are explicitly worth less (king-trap risk).
static const int PST_KINGS[32] = {
      2,   3,   3,   2,
      3,   6,   6,   3,
      5,   7,   7,   5,
      7,   9,   9,   7,
      7,   9,   9,   7,
      5,   7,   7,   5,
      3,   6,   6,   3,
      2,   3,   3,   2,
};

// Mirror for Black (row 0 target, row 7 home)
static inline int getPstBlack(int sq) {
    // Flip rows: 0->7, 7->0 etc.
    // Index mapping in PST_MEN is Row-ordered 7 to 0.
    // Squre index mapping is also roughly top-down 0-31.
    // So for Black, we just access the mirrored square.
    return PST_MEN[31 - sq];
}

int evalStructure(const Position& pos) {
    int score = 0;

    // --- Center control (men only) ---
    // Kings get their centrality reward from PST_KINGS + evalKingSafety.
    // Applying CENTER_CTRL_BONUS to kings too caused triple-counting (+29cp for
    // a king on center vs +20cp for a man — king moves dominated every decision).
    Bitboard wc = pos.whiteMen & CENTER_4;
    while (wc) { wc &= wc-1; score += CENTER_CTRL_BONUS; }
    Bitboard bc = pos.blackMen & CENTER_4;
    while (bc) { bc &= bc-1; score -= CENTER_CTRL_BONUS; }

    // --- Positional value (PST) for men ---
    {
        Bitboard wm = pos.whiteMen;
        while (wm) {
            int sq = bsf(wm); wm &= wm-1;
            score += PST_MEN[sq];
        }
    }
    {
        Bitboard bm = pos.blackMen;
        while (bm) {
            int sq = bsf(bm); bm &= bm-1;
            score -= getPstBlack(sq);
        }
    }

    // --- Positional value (PST) for kings — symmetric, centre-peaked ---
    // Without this, kings score identically from any square and the engine
    // shuffles them endlessly without a positional goal.
    {
        Bitboard wk = pos.whiteKings;
        while (wk) {
            int sq = bsf(wk); wk &= wk-1;
            score += PST_KINGS[sq];
        }
    }
    {
        Bitboard bk = pos.blackKings;
        while (bk) {
            int sq = bsf(bk); bk &= bk-1;
            score -= PST_KINGS[31 - sq];  // symmetric: same centre preference
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

    // --- Piece support ("connected pair") ---
    // A man with a friendly piece diagonally behind it is safe to advance and
    // forms the staircase structure that underpins draughts tactical play.
    {
        Bitboard wFriendly = pos.whiteMen | pos.whiteKings;
        Bitboard bFriendly = pos.blackMen | pos.blackKings;

        Bitboard wm2 = pos.whiteMen;
        while (wm2) {
            int sq = bsf(wm2); wm2 &= wm2 - 1;
            bool supported = false;
            if (SE_MASK[sq] && ((wFriendly >> bsf(SE_MASK[sq])) & 1)) supported = true;
            if (!supported && SW_MASK[sq] && ((wFriendly >> bsf(SW_MASK[sq])) & 1)) supported = true;
            if (supported) score += SUPPORT_BONUS;
        }

        Bitboard bm3 = pos.blackMen;
        while (bm3) {
            int sq = bsf(bm3); bm3 &= bm3 - 1;
            bool supported = false;
            if (NE_MASK[sq] && ((bFriendly >> bsf(NE_MASK[sq])) & 1)) supported = true;
            if (!supported && NW_MASK[sq] && ((bFriendly >> bsf(NW_MASK[sq])) & 1)) supported = true;
            if (supported) score -= SUPPORT_BONUS;
        }
    }

    // --- Material-imbalance exchange incentive ---
    // When ahead by ≥2 men-equivalent, prefer fewer total pieces (simplified
    // endings are easier to convert).  When behind, prefer more pieces on board.
    {
        int wMat = popcount(pos.whiteMen) + popcount(pos.whiteKings);
        int bMat = popcount(pos.blackMen) + popcount(pos.blackKings);
        int diff  = wMat - bMat;
        int total = wMat + bMat;
        if (diff >= 2)       score += (32 - total) * EXCHANGE_BONUS;
        else if (diff <= -2) score -= (32 - total) * EXCHANGE_BONUS;
    }

    return score;
}
