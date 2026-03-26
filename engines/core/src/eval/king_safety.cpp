#include "eval/king_safety.h"
#include "core/bitboard.h"
#include "core/square_map.h"
#include "core/constants.h"

constexpr int KING_CENTER_BONUS    = 20;  // cp per king on center 4 — Texel-tunable
constexpr int KING_EDGE_PENALTY    = 25;  // cp per king on edge
constexpr int KING_TRAPPED_PENALTY = 60;  // cp for trapped king on back rank

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

    // White king centrality and trapping
    {
        Bitboard wk = pos.whiteKings;
        while (wk) {
            int sq = bsf(wk); wk &= wk-1;
            Bitboard sqMask = (1U << sq);
            if (CENTER_4_KS & sqMask) {
                score += KING_CENTER_BONUS;
            } else if (EDGE_MASK_KS & sqMask) {
                score -= KING_EDGE_PENALTY;
            }
        }
    }

    // Black king centrality and trapping
    {
        Bitboard bk = pos.blackKings;
        while (bk) {
            int sq = bsf(bk); bk &= bk-1;
            Bitboard sqMask = (1U << sq);
            if (CENTER_4_KS & sqMask) {
                score -= KING_CENTER_BONUS;
            } else if (EDGE_MASK_KS & sqMask) {
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

    return score;
}
