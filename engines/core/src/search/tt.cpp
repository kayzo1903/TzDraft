#include "search/tt.h"
#include <cstring>

constexpr int TT_SIZE = 1 << 22;  // 4M entries
static TTEntry TT[TT_SIZE];
static uint8_t g_ttAge = 0;

void incrementTTAge() { g_ttAge++; }

static inline int ttIndex(uint64_t key) {
    return (int)(key & (TT_SIZE - 1));
}

bool probeTT(uint64_t key, int depth, int alpha, int beta,
             int& scoreOut, Move& bestMoveOut) {
    int idx = ttIndex(key);
    const TTEntry& e = TT[idx];
    if (e.key != key) return false;

    bestMoveOut = e.bestMove;

    if (e.depth >= (uint8_t)depth) {
        int s = (int)e.score;
        if (e.flag == TT_EXACT) {
            scoreOut = s;
            return true;
        }
        if (e.flag == TT_LOWERBOUND && s >= beta) {
            scoreOut = s;
            return true;
        }
        if (e.flag == TT_UPPERBOUND && s <= alpha) {
            scoreOut = s;
            return true;
        }
    }
    return false;
}

void storeTT(uint64_t key, int depth, int score, uint8_t flag, const Move& bestMove) {
    int idx = ttIndex(key);
    TTEntry& e = TT[idx];
    // Replacement policy:
    //   1. Stale entries (previous search generation) are always replaced.
    //   2. Same position: always overwrite (fresher / deeper info).
    //   3. Same generation, different position: keep the deeper entry.
    bool stale   = (e.age != g_ttAge);
    bool samePos = (e.key == key);
    if (!stale && !samePos && e.depth > (uint8_t)depth) {
        return;
    }
    e.key      = key;
    e.score    = (int16_t)score;
    e.depth    = (uint8_t)depth;
    e.flag     = flag;
    e.age      = g_ttAge;
    e.bestMove = bestMove;
}

void clearTT() {
    memset(TT, 0, sizeof(TT));
}
