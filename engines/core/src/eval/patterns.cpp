#include "eval/patterns.h"
#include "core/bitboard.h"
#include "core/square_map.h"
#include "core/constants.h"

// Tanzania pattern set (5 key patterns)
//
// Board layout:
// Row 7: sq 0,1,2,3      Row 6: sq 4,5,6,7
// Row 5: sq 8,9,10,11    Row 4: sq 12,13,14,15
// Row 3: sq 16,17,18,19  Row 2: sq 20,21,22,23
// Row 1: sq 24,25,26,27  Row 0: sq 28,29,30,31

int evalPatterns(const Position& pos) {
    int score = 0;

    // Pattern 1: Double corner defence
    // White men on sqs 28+29 or 30+31 = +20
    {
        bool wDC1 = ((pos.whiteMen >> 28) & 1) && ((pos.whiteMen >> 29) & 1);
        bool wDC2 = ((pos.whiteMen >> 30) & 1) && ((pos.whiteMen >> 31) & 1);
        if (wDC1 || wDC2) score += 20;
        // Black mirror: sqs 0+1 or 2+3
        bool bDC1 = ((pos.blackMen >> 0) & 1) && ((pos.blackMen >> 1) & 1);
        bool bDC2 = ((pos.blackMen >> 2) & 1) && ((pos.blackMen >> 3) & 1);
        if (bDC1 || bDC2) score -= 20;
    }

    // Pattern 2: Back rank integrity — all 4 back-rank squares have own men = +15
    {
        static const Bitboard WBACK = (1U<<28)|(1U<<29)|(1U<<30)|(1U<<31);
        static const Bitboard BBACK = (1U<<0)|(1U<<1)|(1U<<2)|(1U<<3);
        if ((pos.whiteMen & WBACK) == WBACK) score += 15;
        if ((pos.blackMen & BBACK) == BBACK) score -= 15;
    }

    // Pattern 3: Man chain — check for 3 connected men on same diagonal
    // A chain = A→B→C where B is NE/NW of A and C is NE/NW of B (for white)
    // Use NE_MASK and NW_MASK to find connected triples
    {
        auto checkChain = [](Bitboard men) -> int {
            int chains = 0;
            Bitboard m = men;
            while (m) {
                int sq = bsf(m); m &= m-1;
                // Check NE chain: sq -> ne1 -> ne2
                if (NE_MASK[sq]) {
                    int ne1 = bsf(NE_MASK[sq]);
                    if ((men >> ne1) & 1) {
                        if (NE_MASK[ne1]) {
                            int ne2 = bsf(NE_MASK[ne1]);
                            if ((men >> ne2) & 1) chains++;
                        }
                    }
                }
                // Check NW chain
                if (NW_MASK[sq]) {
                    int nw1 = bsf(NW_MASK[sq]);
                    if ((men >> nw1) & 1) {
                        if (NW_MASK[nw1]) {
                            int nw2 = bsf(NW_MASK[nw1]);
                            if ((men >> nw2) & 1) chains++;
                        }
                    }
                }
            }
            return chains;
        };
        int wChains = checkChain(pos.whiteMen);
        int bChains = checkChain(pos.blackMen);
        score += (wChains - bChains) * 12;
    }

    // Pattern 4: Promotion threat — man on row 1 (sqs 24-27) with no enemy blocking
    {
        static const Bitboard ROW1 = (1U<<24)|(1U<<25)|(1U<<26)|(1U<<27);
        Bitboard wThreats = pos.whiteMen & ROW1;
        while (wThreats) {
            int sq = bsf(wThreats); wThreats &= wThreats-1;
            // Check NE and NW squares (promotion row)
            bool blocked = false;
            for (int d = 0; d < 2; d++) {
                uint32_t adj = (d==0) ? NE_MASK[sq] : NW_MASK[sq];
                if (adj) {
                    int toSq = bsf(adj);
                    Bitboard occ = pos.whiteMen | pos.whiteKings | pos.blackMen | pos.blackKings;
                    if ((occ >> toSq) & 1) blocked = true;
                }
            }
            if (!blocked) score += 25;
        }

        // Black promotion threat: row 6 (sqs 4-7), moving SE/SW to row 7 (sqs 0-3)
        static const Bitboard ROW6 = (1U<<4)|(1U<<5)|(1U<<6)|(1U<<7);
        Bitboard bThreats = pos.blackMen & ROW6;
        while (bThreats) {
            int sq = bsf(bThreats); bThreats &= bThreats-1;
            bool blocked = false;
            for (int d = 2; d < 4; d++) {
                uint32_t adj = (d==2) ? SE_MASK[sq] : SW_MASK[sq];
                if (adj) {
                    int toSq = bsf(adj);
                    Bitboard occ = pos.whiteMen | pos.whiteKings | pos.blackMen | pos.blackKings;
                    if ((occ >> toSq) & 1) blocked = true;
                }
            }
            if (!blocked) score -= 25;
        }
    }

    // Pattern 5: Man cluster center — 2+ men on center 8 squares = +10
    {
        // Center 8 squares: rows 3-4, approximately sqs 12-19
        static const Bitboard CENTER8 =
            (1U<<12)|(1U<<13)|(1U<<14)|(1U<<15)|
            (1U<<16)|(1U<<17)|(1U<<18)|(1U<<19);
        int wCenter = popcount(pos.whiteMen & CENTER8);
        int bCenter = popcount(pos.blackMen & CENTER8);
        if (wCenter >= 2) score += 10;
        if (bCenter >= 2) score -= 10;
    }

    return score;
}
