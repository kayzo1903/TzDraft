#include "search/tt.h"
#include <cstring>

constexpr int TT_SIZE = 1 << 22;  // ~4M entries ≈ 64MB
static TTEntry TT[TT_SIZE];

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
    // Always replace (simple replacement strategy)
    e.key      = key;
    e.score    = (int16_t)score;
    e.depth    = (uint8_t)depth;
    e.flag     = flag;
    e.bestMove = bestMove;
}

void clearTT() {
    memset(TT, 0, sizeof(TT));
}
