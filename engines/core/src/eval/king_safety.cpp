#include "eval/king_safety.h"
#include "core/bitboard.h"
#include "core/square_map.h"
#include "core/constants.h"
#include <cstdlib>  // abs

constexpr int KING_CENTER_BONUS    = 10;  // cp per king on center 4 — Texel-tunable
constexpr int KING_EDGE_PENALTY    = 18;  // cp per king on edge
constexpr int KING_TRAPPED_PENALTY = 55;  // cp for trapped king on back rank
// When one side has a king and the other has only men, the king dominates.
// Bonus = base + per_enemy_man * enemy_men (more targets = more winning chances).
constexpr int KING_DOMINANCE_BASE  = 40;  // flat bonus for having king vs no kings
constexpr int KING_DOMINANCE_MAN   =  8;  // extra cp per enemy man the king can hunt

// Center 4 squares: 13,14,17,18
static const Bitboard CENTER_4_KS = (1U<<13)|(1U<<14)|(1U<<17)|(1U<<18);

// Edge squares: row 0, row 7, col 0, col 7
// row 0: 28,29,30,31; row 7: 0,1,2,3; col 0: 4,12,20,28; col 7: 3,11,19,27,...
// Simple approximation: outer ring
static const Bitboard EDGE_MASK_KS =
    (1U<<0)|(1U<<1)|(1U<<2)|(1U<<3)|      // row 7
    (1U<<28)|(1U<<29)|(1U<<30)|(1U<<31)|  // row 0
    (1U<<4)|(1U<<8)|(1U<<12)|(1U<<16)|(1U<<20)|(1U<<24)|  // col 0 (even rows)
    (1U<<7)|(1U<<11)|(1U<<15)|(1U<<19)|(1U<<23)|(1U<<27); // col 7 (odd rows)

int evalKingSafety(const Position& pos, const RuleConfig& rules) {
    int score = 0;

    // White king edge penalty only — centrality is already handled by PST_KINGS.
    // KING_CENTER_BONUS was double-counting with PST_KINGS centre peak (+11cp),
    // making kings 9cp more rewarded than men on the same squares.
    {
        Bitboard wk = pos.whiteKings;
        while (wk) {
            int sq = bsf(wk); wk &= wk-1;
            if (EDGE_MASK_KS & (1U << sq)) {
                score -= KING_EDGE_PENALTY;
            }
        }
    }

    // Black king edge penalty only
    {
        Bitboard bk = pos.blackKings;
        while (bk) {
            int sq = bsf(bk); bk &= bk-1;
            if (EDGE_MASK_KS & (1U << sq)) {
                score += KING_EDGE_PENALTY;
            }
        }
    }

    // Trapped king penalty: king on back rank with no available moves
    // White kings on row 0 (sqs 28-31)
    {
        static const Bitboard WHITE_BACK_ROW = (1U<<28)|(1U<<29)|(1U<<30)|(1U<<31);
        Bitboard wk = pos.whiteKings & WHITE_BACK_ROW;
        while (wk) {
            int sq = bsf(wk); wk &= wk-1;
            // Check adjacency: if all neighbors occupied, trapped
            Bitboard occ = pos.whiteMen | pos.whiteKings | pos.blackMen | pos.blackKings;
            bool trapped = true;
            for (int d = 0; d < 4; d++) {
                uint32_t adj = 0;
                switch(d) {
                    case 0: adj = NE_MASK[sq]; break;
                    case 1: adj = NW_MASK[sq]; break;
                    case 2: adj = SE_MASK[sq]; break;
                    case 3: adj = SW_MASK[sq]; break;
                }
                if (adj && !((occ >> bsf(adj)) & 1)) { trapped = false; break; }
            }
            if (trapped) score -= KING_TRAPPED_PENALTY;
        }
    }
    {
        static const Bitboard BLACK_BACK_ROW = (1U<<0)|(1U<<1)|(1U<<2)|(1U<<3);
        Bitboard bk = pos.blackKings & BLACK_BACK_ROW;
        while (bk) {
            int sq = bsf(bk); bk &= bk-1;
            Bitboard occ = pos.whiteMen | pos.whiteKings | pos.blackMen | pos.blackKings;
            bool trapped = true;
            for (int d = 0; d < 4; d++) {
                uint32_t adj = 0;
                switch(d) {
                    case 0: adj = NE_MASK[sq]; break;
                    case 1: adj = NW_MASK[sq]; break;
                    case 2: adj = SE_MASK[sq]; break;
                    case 3: adj = SW_MASK[sq]; break;
                }
                if (adj && !((occ >> bsf(adj)) & 1)) { trapped = false; break; }
            }
            if (trapped) score += KING_TRAPPED_PENALTY;
        }
    }

    // King dominance: reward having kings when opponent has none
    {
        bool whiteHasKings = pos.whiteKings != 0;
        bool blackHasKings = pos.blackKings != 0;
        if (whiteHasKings && !blackHasKings) {
            int enemyMen = popcount(pos.blackMen);
            score += KING_DOMINANCE_BASE + KING_DOMINANCE_MAN * enemyMen;
        }
        if (blackHasKings && !whiteHasKings) {
            int enemyMen = popcount(pos.whiteMen);
            score -= KING_DOMINANCE_BASE + KING_DOMINANCE_MAN * enemyMen;
        }
    }

    // King centrality: bonus for kings in the active middle of the board.
    // PST_KINGS peaks at 9cp for center — add explicit activity bonus on top
    // so shuffling on edge/near-edge is clearly punished vs. heading toward center.
    {
        // Inner center ring: rows 3-4, cols 2-5 (internal sqs 13,14,17,18)
        static const Bitboard KING_INNER = (1U<<13)|(1U<<14)|(1U<<17)|(1U<<18);
        // Outer center ring: rows 3-5, cols 0-7 minus inner (sqs 9,10,11,12,15,16,19,21,22)
        static const Bitboard KING_OUTER =
            (1U<<9)|(1U<<10)|(1U<<11)|
            (1U<<12)|(1U<<15)|
            (1U<<16)|(1U<<19)|
            (1U<<21)|(1U<<22);
        constexpr int INNER_BONUS = 12;
        constexpr int OUTER_BONUS =  6;
        score += popcount(pos.whiteKings & KING_INNER) * INNER_BONUS;
        score += popcount(pos.whiteKings & KING_OUTER) * OUTER_BONUS;
        score -= popcount(pos.blackKings & KING_INNER) * INNER_BONUS;
        score -= popcount(pos.blackKings & KING_OUTER) * OUTER_BONUS;
    }

    // Endgame: king chases lone men — reward being close to the nearest enemy man.
    // Without this, a lone king shuffles on the edge while enemy men march freely.
    {
        int wKings = popcount(pos.whiteKings);
        int bKings = popcount(pos.blackKings);
        int wMen   = popcount(pos.whiteMen);
        int bMen   = popcount(pos.blackMen);

        // White king hunting black men (no black kings to hide behind)
        if (wKings > 0 && bKings == 0 && bMen > 0) {
            Bitboard wk = pos.whiteKings;
            while (wk) {
                int ksq = bsf(wk); wk &= wk - 1;
                int kRow = sqRow(ksq), kCol = sqCol(ksq);
                int minDist = 99;
                Bitboard bm = pos.blackMen;
                while (bm) {
                    int msq = bsf(bm); bm &= bm - 1;
                    int dist = abs(sqRow(msq) - kRow) + abs(sqCol(msq) - kCol);
                    if (dist < minDist) minDist = dist;
                }
                // Closer = higher score (max bonus 8*7=56 when adjacent)
                score += (8 - minDist) * 4;
            }
        }
        // Black king hunting white men
        if (bKings > 0 && wKings == 0 && wMen > 0) {
            Bitboard bk = pos.blackKings;
            while (bk) {
                int ksq = bsf(bk); bk &= bk - 1;
                int kRow = sqRow(ksq), kCol = sqCol(ksq);
                int minDist = 99;
                Bitboard wm = pos.whiteMen;
                while (wm) {
                    int msq = bsf(wm); wm &= wm - 1;
                    int dist = abs(sqRow(msq) - kRow) + abs(sqCol(msq) - kCol);
                    if (dist < minDist) minDist = dist;
                }
                score -= (8 - minDist) * 4;
            }
        }

        // Pure K vs K (no men): eval is 0 — neither side can win, stop wasting time
        if (wKings > 0 && bKings > 0 && wMen == 0 && bMen == 0) {
            return 0;
        }
    }

    return score;
}
