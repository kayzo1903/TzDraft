#include "board/hash.h"
#include "core/bitboard.h"

uint64_t ZOBRIST_PIECE[4][32];
uint64_t ZOBRIST_SIDE;

// Deterministic xorshift64 seeded with a fixed value
static uint64_t xorshift64(uint64_t& state) {
    state ^= state << 13;
    state ^= state >> 7;
    state ^= state << 17;
    return state;
}

void initZobrist() {
    uint64_t state = 0xDEADBEEFCAFEBABEULL;
    for (int pt = 0; pt < 4; pt++) {
        for (int sq = 0; sq < 32; sq++) {
            ZOBRIST_PIECE[pt][sq] = xorshift64(state);
        }
    }
    ZOBRIST_SIDE = xorshift64(state);
}

uint64_t computeHash(const Position& pos) {
    uint64_t h = 0;
    Bitboard b;

    b = pos.whiteMen;
    while (b) { int sq = bsf(b); b &= b - 1; h ^= ZOBRIST_PIECE[0][sq]; }

    b = pos.whiteKings;
    while (b) { int sq = bsf(b); b &= b - 1; h ^= ZOBRIST_PIECE[1][sq]; }

    b = pos.blackMen;
    while (b) { int sq = bsf(b); b &= b - 1; h ^= ZOBRIST_PIECE[2][sq]; }

    b = pos.blackKings;
    while (b) { int sq = bsf(b); b &= b - 1; h ^= ZOBRIST_PIECE[3][sq]; }

    if (pos.sideToMove == 1) h ^= ZOBRIST_SIDE;

    return h;
}
