#include "eval/patterns.h"
#include "core/bitboard.h"
#include "core/square_map.h"
#include "core/constants.h"
#include <cstdlib>  // abs

// Pattern weights — Texel-tunable
constexpr int DOUBLE_CORNER_BONUS    = 20;
constexpr int BACK_RANK_BONUS        = 15;
constexpr int CHAIN_BONUS            = 30;
constexpr int PROMO_THREAT_BONUS     = 60;
constexpr int CENTER_CLUSTER_BONUS   = 10;
constexpr int SUPP_PROMO_BONUS       = 20;
constexpr int BLOCKED_MAN_PENALTY    = 8;
constexpr int KING_TRAP_EDGE_PENALTY = 25;
constexpr int WINDOW_COHESION_BONUS  = 15;

// Tanzania pattern set
//
// Board layout:
// Row 7: sq 0,1,2,3      Row 6: sq 4,5,6,7
// Row 5: sq 8,9,10,11    Row 4: sq 12,13,14,15
// Row 3: sq 16,17,18,19  Row 2: sq 20,21,22,23
// Row 1: sq 24,25,26,27  Row 0: sq 28,29,30,31

// ── 3×3 local occupancy windows ───────────────────────────────────────────────
// 12 windows of 3 dark squares each. State per square: 0=empty 1=wm 2=wk 3=bm 4=bk.
// Index = s0 + 5*s1 + 25*s2  (base-5, 125 states per window).
// Weights are initialised from simple structural rules and replaced by Texel tuning.

static constexpr int NUM_WINDOWS = 12;
static constexpr int WINDOW_STATES = 125;  // 5^3

// Verified diagonal / cluster triads (see board layout above)
static const int WINDOWS[NUM_WINDOWS][3] = {
    {28, 24, 21},   //  0: white left  NE lower  (28→24→21)
    {24, 21, 17},   //  1: white left  NE mid    (21→NE→17)
    {31, 26, 22},   //  2: white right NW lower  (31→26→22)
    {26, 22, 17},   //  3: white right NW mid    (22→NW→17)
    { 0,  5,  9},   //  4: black left  SE lower  (0→5→9)
    { 5,  9, 14},   //  5: black left  SE mid    (9→SE→14)
    { 3,  7, 10},   //  6: black right SW lower  (3→7→10)
    { 7, 10, 14},   //  7: black right SW mid    (10→SW→14)
    {13, 14, 17},   //  8: center triangle A
    {13, 17, 18},   //  9: center triangle B
    {14, 17, 18},   // 10: center triangle C
    {13, 14, 18},   // 11: center triangle D
};

static int g_windowWeights[NUM_WINDOWS][WINDOW_STATES];
static bool g_windowsInit = false;

static void initWindowWeights() {
    // piece net value inside a window (small scale — main material is in evalMaterial)
    static const int PV[5] = {0, 2, 4, -2, -4};  // empty, wm, wk, bm, bk

    for (int w = 0; w < NUM_WINDOWS; w++) {
        for (int c = 0; c < WINDOW_STATES; c++) {
            int s0 = c % 5;
            int s1 = (c / 5) % 5;
            int s2 = c / 25;

            int score = PV[s0] + PV[s1] + PV[s2];

            // Cohesion: all three squares same colour
            int wCnt = ((s0==1||s0==2)?1:0) + ((s1==1||s1==2)?1:0) + ((s2==1||s2==2)?1:0);
            int bCnt = ((s0==3||s0==4)?1:0) + ((s1==3||s1==4)?1:0) + ((s2==3||s2==4)?1:0);
            if (wCnt == 3) score += WINDOW_COHESION_BONUS;
            if (bCnt == 3) score -= WINDOW_COHESION_BONUS;

            g_windowWeights[w][c] = score;
        }
    }
    g_windowsInit = true;
}

static int evalWindowPatterns(const Position& pos) {
    if (!g_windowsInit) initWindowWeights();

    int score = 0;
    for (int w = 0; w < NUM_WINDOWS; w++) {
        int idx = 0;
        int mult = 1;
        for (int i = 0; i < 3; i++) {
            int sq = WINDOWS[w][i];
            Bitboard mask = 1U << sq;
            int state;
            if      (pos.whiteMen   & mask) state = 1;
            else if (pos.whiteKings & mask) state = 2;
            else if (pos.blackMen   & mask) state = 3;
            else if (pos.blackKings & mask) state = 4;
            else                            state = 0;
            idx += state * mult;
            mult *= 5;
        }
        score += g_windowWeights[w][idx];
    }
    return score;
}

int evalPatterns(const Position& pos) {
    int score = 0;

    // Pattern 1: Double corner defence
    // White men on sqs 28+29 or 30+31 = +20
    {
        bool wDC1 = ((pos.whiteMen >> 28) & 1) && ((pos.whiteMen >> 29) & 1);
        bool wDC2 = ((pos.whiteMen >> 30) & 1) && ((pos.whiteMen >> 31) & 1);
        if (wDC1 || wDC2) score += DOUBLE_CORNER_BONUS;
        // Black mirror: sqs 0+1 or 2+3
        bool bDC1 = ((pos.blackMen >> 0) & 1) && ((pos.blackMen >> 1) & 1);
        bool bDC2 = ((pos.blackMen >> 2) & 1) && ((pos.blackMen >> 3) & 1);
        if (bDC1 || bDC2) score -= DOUBLE_CORNER_BONUS;
    }

    // Pattern 2: Back rank integrity — all 4 back-rank squares have own men = +15
    {
        static const Bitboard WBACK = (1U<<28)|(1U<<29)|(1U<<30)|(1U<<31);
        static const Bitboard BBACK = (1U<<0)|(1U<<1)|(1U<<2)|(1U<<3);
        if ((pos.whiteMen & WBACK) == WBACK) score += BACK_RANK_BONUS;
        if ((pos.blackMen & BBACK) == BBACK) score -= BACK_RANK_BONUS;
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
        score += (wChains - bChains) * CHAIN_BONUS;
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
            if (!blocked) score += PROMO_THREAT_BONUS;
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
            if (!blocked) score -= PROMO_THREAT_BONUS;
        }
    }

    // Pattern 5: Man cluster center — 2+ men on center 8 squares = +10
    {
        static const Bitboard CENTER8 =
            (1U<<12)|(1U<<13)|(1U<<14)|(1U<<15)|
            (1U<<16)|(1U<<17)|(1U<<18)|(1U<<19);
        int wCenter = popcount(pos.whiteMen & CENTER8);
        int bCenter = popcount(pos.blackMen & CENTER8);
        if (wCenter >= 2) score += CENTER_CLUSTER_BONUS;
        if (bCenter >= 2) score -= CENTER_CLUSTER_BONUS;
    }

    // Pattern 6: Supported promotion threat — man one step from back rank with a
    // friendly man directly behind (SE/SW for white, NE/NW for black).
    // A supported promotion runner is very hard to stop.
    {
        static const Bitboard ROW6W = (1U<<4)|(1U<<5)|(1U<<6)|(1U<<7);  // white on row 6
        Bitboard wRun = pos.whiteMen & ROW6W;
        while (wRun) {
            int sq = bsf(wRun); wRun &= wRun - 1;
            bool supported = false;
            if (SE_MASK[sq] && ((pos.whiteMen >> bsf(SE_MASK[sq])) & 1)) supported = true;
            if (SW_MASK[sq] && ((pos.whiteMen >> bsf(SW_MASK[sq])) & 1)) supported = true;
            if (supported) score += SUPP_PROMO_BONUS;
        }
        static const Bitboard ROW1B = (1U<<24)|(1U<<25)|(1U<<26)|(1U<<27);  // black on row 1
        Bitboard bRun = pos.blackMen & ROW1B;
        while (bRun) {
            int sq = bsf(bRun); bRun &= bRun - 1;
            bool supported = false;
            if (NE_MASK[sq] && ((pos.blackMen >> bsf(NE_MASK[sq])) & 1)) supported = true;
            if (NW_MASK[sq] && ((pos.blackMen >> bsf(NW_MASK[sq])) & 1)) supported = true;
            if (supported) score -= SUPP_PROMO_BONUS;
        }
    }

    // Pattern 7: Blocked man — man whose both forward squares are occupied by
    // friendly pieces; contributes nothing to the advance.
    {
        Bitboard wFriendly = pos.whiteMen | pos.whiteKings;
        Bitboard bFriendly = pos.blackMen | pos.blackKings;
        Bitboard wm = pos.whiteMen;
        while (wm) {
            int sq = bsf(wm); wm &= wm - 1;
            bool blockedNE = !NE_MASK[sq] || ((wFriendly >> bsf(NE_MASK[sq])) & 1);
            bool blockedNW = !NW_MASK[sq] || ((wFriendly >> bsf(NW_MASK[sq])) & 1);
            if (blockedNE && blockedNW) score -= BLOCKED_MAN_PENALTY;
        }
        Bitboard bm2 = pos.blackMen;
        while (bm2) {
            int sq = bsf(bm2); bm2 &= bm2 - 1;
            bool blockedSE = !SE_MASK[sq] || ((bFriendly >> bsf(SE_MASK[sq])) & 1);
            bool blockedSW = !SW_MASK[sq] || ((bFriendly >> bsf(SW_MASK[sq])) & 1);
            if (blockedSE && blockedSW) score += BLOCKED_MAN_PENALTY;
        }
    }

    // Pattern 8: King trapped on edge with enemy support — a decisive Tanzania motif.
    // Own king on an edge square that has ≥2 adjacent enemy pieces = major penalty.
    {
        static const Bitboard EDGE = (1U<<0)|(1U<<1)|(1U<<2)|(1U<<3)|
                                     (1U<<28)|(1U<<29)|(1U<<30)|(1U<<31)|
                                     (1U<<4)|(1U<<8)|(1U<<12)|(1U<<16)|(1U<<20)|(1U<<24)|
                                     (1U<<7)|(1U<<11)|(1U<<15)|(1U<<19)|(1U<<23)|(1U<<27);
        static const uint32_t* const DIRS[4] = {NE_MASK, NW_MASK, SE_MASK, SW_MASK};
        Bitboard wEnemy = pos.blackMen | pos.blackKings;
        Bitboard bEnemy = pos.whiteMen | pos.whiteKings;

        Bitboard wk = pos.whiteKings & EDGE;
        while (wk) {
            int sq = bsf(wk); wk &= wk - 1;
            int enemyAdj = 0;
            for (int d = 0; d < 4; d++) {
                if (DIRS[d][sq] && ((wEnemy >> bsf(DIRS[d][sq])) & 1)) enemyAdj++;
            }
            if (enemyAdj >= 2) score -= KING_TRAP_EDGE_PENALTY;
        }
        Bitboard bk2 = pos.blackKings & EDGE;
        while (bk2) {
            int sq = bsf(bk2); bk2 &= bk2 - 1;
            int enemyAdj = 0;
            for (int d = 0; d < 4; d++) {
                if (DIRS[d][sq] && ((bEnemy >> bsf(DIRS[d][sq])) & 1)) enemyAdj++;
            }
            if (enemyAdj >= 2) score += KING_TRAP_EDGE_PENALTY;
        }
    }

    // 3×3 local occupancy windows
    score += evalWindowPatterns(pos);

    return score;
}
