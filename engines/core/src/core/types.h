#ifndef CORE_TYPES_H
#define CORE_TYPES_H

#include <cstdint>

// 32-bit bitboard for 8x8 draughts
using Bitboard = uint32_t;

// Engine variant interface
enum class Variant {
    Tanzania,
    Russian,
    International
};

struct Position {
    Bitboard whiteMen;
    Bitboard whiteKings;
    Bitboard blackMen;
    Bitboard blackKings;

    int sideToMove;   // 0 = white, 1 = black
    uint64_t zobrist;
    int ply;
    int fiftyMove;
    int fullMove;     // 1-based full-move counter (increments after each black move)
};

// Derived board properties
inline Bitboard occupied(const Position& p) {
    return p.whiteMen | p.whiteKings | p.blackMen | p.blackKings;
}

inline Bitboard emptyCount(const Position& p) {
    return ~occupied(p) & 0xFFFFFFFF;
}

struct Move {
    uint8_t from;
    uint8_t to;
    uint8_t path[12];      // multi-jump landing squares (one per captured piece)
    uint8_t captures[12];  // captured square indices (flying kings can capture all 12 opponent pieces)
    uint8_t pathLen;
    uint8_t capLen;
    bool promote;
    int16_t score;         // filled by move orderer
};

struct Undo {
    Bitboard capturedWhiteMen;
    Bitboard capturedWhiteKings;
    Bitboard capturedBlackMen;
    Bitboard capturedBlackKings;
    uint64_t oldZobrist;
    int oldFiftyMove;
};

#endif // CORE_TYPES_H
