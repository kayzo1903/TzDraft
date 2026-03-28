#include "core/bitboard.h"
#include <cstdint>

int popcount(Bitboard b) {
#if defined(__GNUC__) || defined(__clang__)
    return __builtin_popcount(b);
#else
    // Portable Kernighan method
    int count = 0;
    while (b) { b &= b - 1; ++count; }
    return count;
#endif
}

int lsb(Bitboard b) {
    if (b == 0) return -1;
#if defined(__GNUC__) || defined(__clang__)
    return __builtin_ctz(b);
#else
    int idx = 0;
    while ((b & 1) == 0) { b >>= 1; ++idx; }
    return idx;
#endif
}

int msb(Bitboard b) {
    if (b == 0) return -1;
#if defined(__GNUC__) || defined(__clang__)
    return 31 - __builtin_clz(b);
#else
    int idx = 0;
    while (b >>= 1) ++idx;
    return idx;
#endif
}

int bsf(Bitboard b) {
    return lsb(b);
}
