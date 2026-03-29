#include "core/constants.h"
#include "core/square_map.h"
#include <iostream>

// Defined externally in constants.h
uint32_t NE_MASK[32] = {0};
uint32_t NW_MASK[32] = {0};
uint32_t SE_MASK[32] = {0};
uint32_t SW_MASK[32] = {0};
uint32_t JUMP_OVER[32][4] = {};  // 0=NE, 1=NW, 2=SE, 3=SW
uint32_t JUMP_LAND[32][4] = {};
uint8_t  DIAG_RAY[32][4][7] = {};
uint8_t  DIAG_RAY_LEN[32][4] = {};

// Board layout:
// Row 7 (black back rank):  sq 0(col1)  sq 1(col3)  sq 2(col5)  sq 3(col7)
// Row 6:                    sq 4(col0)  sq 5(col2)  sq 6(col4)  sq 7(col6)
// Row 5:                    sq 8(col1)  sq 9(col3)  sq10(col5)  sq11(col7)
// Row 4:                    sq12(col0)  sq13(col2)  sq14(col4)  sq15(col6)
// Row 3:                    sq16(col1)  sq17(col3)  sq18(col5)  sq19(col7)
// Row 2:                    sq20(col0)  sq21(col2)  sq22(col4)  sq23(col6)
// Row 1:                    sq24(col1)  sq25(col3)  sq26(col5)  sq27(col7)
// Row 0 (white back rank):  sq28(col0)  sq29(col2)  sq30(col4)  sq31(col6)
//
// row(sq) = 7 - (sq >> 2)
// if row is odd:  col = (sq & 3) * 2 + 1
// if row is even: col = (sq & 3) * 2
// sq_from_rc(r,c) = (7-r)*4 + c/2  (only when (r+c)%2==1)

int sqRow(int sq) {
    return 7 - (sq >> 2);
}

int sqCol(int sq) {
    int row = sqRow(sq);
    if (row & 1) {
        return (sq & 3) * 2 + 1;
    } else {
        return (sq & 3) * 2;
    }
}

int rcToSq(int row, int col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return -1;
    // Dark squares have (row + col) even:
    // e.g. row7,col1 → 7+1=8 (even); row6,col0 → 6+0=6 (even)
    if ((row + col) % 2 != 0) return -1;
    return (7 - row) * 4 + col / 2;
}

void initSquareMaps() {
    // Initialize all direction masks and jump tables using board geometry.
    // Directions: 0=NE(+row,+col), 1=NW(+row,-col), 2=SE(-row,+col), 3=SW(-row,-col)
    // White forward = NE(0), NW(1). Black forward = SE(2), SW(3).

    // Direction deltas: (dr, dc)
    const int DR[4] = { 1,  1, -1, -1 };
    const int DC[4] = { 1, -1,  1, -1 };

    for (int sq = 0; sq < 32; sq++) {
        NE_MASK[sq] = 0;
        NW_MASK[sq] = 0;
        SE_MASK[sq] = 0;
        SW_MASK[sq] = 0;

        int row = sqRow(sq);
        int col = sqCol(sq);

        for (int d = 0; d < 4; d++) {
            // Step 1: adjacent square
            int r1 = row + DR[d];
            int c1 = col + DC[d];
            int adj = rcToSq(r1, c1);

            // Step 2: jump-land square (2 steps in direction d)
            int r2 = row + 2 * DR[d];
            int c2 = col + 2 * DC[d];
            int land = rcToSq(r2, c2);

            // Set direction mask (bit of adjacent square)
            uint32_t adjMask = (adj >= 0) ? (1U << adj) : 0;
            switch (d) {
                case 0: NE_MASK[sq] = adjMask; break;
                case 1: NW_MASK[sq] = adjMask; break;
                case 2: SE_MASK[sq] = adjMask; break;
                case 3: SW_MASK[sq] = adjMask; break;
            }

            // Set jump tables
            JUMP_OVER[sq][d] = (adj >= 0)  ? (uint32_t)adj  : 0xFF;
            JUMP_LAND[sq][d] = (land >= 0) ? (uint32_t)land : 0xFF;
        }
    }

    // Build diagonal ray tables for flying king move/capture generation.
    // Each entry lists the squares reachable step-by-step in one direction.
    for (int sq = 0; sq < 32; sq++) {
        int row = sqRow(sq);
        int col = sqCol(sq);
        for (int d = 0; d < 4; d++) {
            uint8_t len = 0;
            for (int step = 1; step <= 7; step++) {
                int r2 = row + DR[d] * step;
                int c2 = col + DC[d] * step;
                int nsq = rcToSq(r2, c2);
                if (nsq < 0) break;
                DIAG_RAY[sq][d][len++] = (uint8_t)nsq;
            }
            DIAG_RAY_LEN[sq][d] = len;
        }
    }

    std::cout << "{\"type\":\"log\", \"message\":\"Square maps initialized\"}\n";
}
