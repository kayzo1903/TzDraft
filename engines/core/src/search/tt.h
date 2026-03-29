#ifndef SEARCH_TT_H
#define SEARCH_TT_H

#include "core/types.h"
#include <cstdint>

constexpr uint8_t TT_EXACT      = 0;
constexpr uint8_t TT_LOWERBOUND = 1;
constexpr uint8_t TT_UPPERBOUND = 2;

struct TTEntry {
    uint64_t key;
    int16_t  score;
    uint8_t  depth;
    uint8_t  flag;      // TT_EXACT / TT_LOWERBOUND / TT_UPPERBOUND
    uint8_t  age;       // search generation — stale entries are replaced first
    Move     bestMove;
};

// Probe the TT. Returns true if a usable entry was found.
// If found, updates scoreOut and/or bestMoveOut and may narrow alpha/beta.
bool probeTT(uint64_t key, int depth, int alpha, int beta,
             int& scoreOut, Move& bestMoveOut);

// Store an entry in the TT.
void storeTT(uint64_t key, int depth, int score, uint8_t flag, const Move& bestMove);

// Clear the entire transposition table.
void clearTT();

// Increment the global generation counter (call once at the start of each root search).
void incrementTTAge();

#endif // SEARCH_TT_H
