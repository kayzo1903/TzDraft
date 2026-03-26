#ifndef CORE_BITBOARD_H
#define CORE_BITBOARD_H

#include "types.h"
#include <cstdint>

// Bit helpers for 32-bit draughts bitboards

int  popcount(Bitboard b);
int  lsb(Bitboard b);      // index of least significant set bit
int  msb(Bitboard b);      // index of most significant set bit
int  bsf(Bitboard b);      // bitscan forward (same as lsb)

// Iterate over set bits: use while(b) { int sq = bsf(b); b &= b-1; ... }

#endif // CORE_BITBOARD_H
