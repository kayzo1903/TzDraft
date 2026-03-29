#ifndef CORE_CONSTANTS_H
#define CORE_CONSTANTS_H

#include "types.h"

// Core square masks and edges
constexpr Bitboard PROMOTION_MASK_WHITE = 0x0000000F; // Row 7 squares (bits 0-3)
constexpr Bitboard PROMOTION_MASK_BLACK = 0xF0000000; // Row 0 squares (bits 28-31)
constexpr Bitboard CENTER_MASK          = 0x0C0C0C0C; // Inner 8 squares (approx 13, 14, 17, 18, etc.)

// Bit shifting edges to prevent wrapping on an 8x8 board mapping to 32 bits
// In standard 32-square notation, shifting by 4 or 5 is common, but edges must be masked.
constexpr Bitboard RIGHT_EDGE_MASK = 0x11111111; // Squares 3, 7, 11, 15, 19, 23, 27, 31
constexpr Bitboard LEFT_EDGE_MASK  = 0x88888888; // Squares 0, 4, 8, 12, 16, 20, 24, 28

extern uint32_t NE_MASK[32];
extern uint32_t NW_MASK[32];
extern uint32_t SE_MASK[32];
extern uint32_t SW_MASK[32];
extern uint32_t JUMP_OVER[32][4];
extern uint32_t JUMP_LAND[32][4];

// Diagonal ray tables for flying kings (Art. 3.2, 4.3).
// DIAG_RAY[sq][d][i] = the i-th square in direction d from sq (0=NE,1=NW,2=SE,3=SW).
// DIAG_RAY_LEN[sq][d] = number of valid squares in that direction (0–7).
extern uint8_t DIAG_RAY[32][4][7];
extern uint8_t DIAG_RAY_LEN[32][4];

#endif // CORE_CONSTANTS_H
