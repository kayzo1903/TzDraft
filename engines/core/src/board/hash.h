#ifndef BOARD_HASH_H
#define BOARD_HASH_H

#include "core/types.h"
#include <cstdint>

// Piece type indices for Zobrist table
// 0=whiteMen, 1=whiteKings, 2=blackMen, 3=blackKings
extern uint64_t ZOBRIST_PIECE[4][32];
extern uint64_t ZOBRIST_SIDE;   // XOR when black to move

void     initZobrist();
uint64_t computeHash(const Position& pos);

#endif // BOARD_HASH_H
