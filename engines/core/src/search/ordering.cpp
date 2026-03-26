#include "search/ordering.h"
#include "search/killers.h"
#include "search/history.h"
#include "eval/eval.h"
#include <algorithm>

static const int SCORE_TT_MOVE   = 30000;
static const int SCORE_CAPTURE   = 10000;
static const int SCORE_PROMOTION = 8000;
static const int SCORE_KILLER    = 5000;

void scoreMoves(Move* moves, int count, const Move& ttMove,
                const Position& pos, int ply) {
    bool hasTT = (ttMove.from != 0xFF);
    // Enemy kings bitboard — used to value captured pieces
    Bitboard enemyKings = (pos.sideToMove == 0) ? pos.blackKings : pos.whiteKings;

    for (int i = 0; i < count; i++) {
        Move& m = moves[i];
        int s = 0;

        // TT move gets highest priority
        if (hasTT && m.from == ttMove.from && m.to == ttMove.to) {
            s = SCORE_TT_MOVE;
        } else if (m.capLen > 0) {
            // Score by total material captured (king=300, man=100).
            // This naturally orders: more captures > fewer, king captures > man.
            int capturedVal = 0;
            for (int ci = 0; ci < m.capLen; ci++) {
                capturedVal += ((enemyKings >> m.captures[ci]) & 1) ? KING_VALUE : MAN_VALUE;
            }
            s = SCORE_CAPTURE + capturedVal;
        } else if (m.promote) {
            s = SCORE_PROMOTION;
        } else if (isKiller(ply, m)) {
            s = SCORE_KILLER;
        } else {
            // History heuristic
            s = getHistory(pos.sideToMove, m.from, m.to);
        }

        m.score = (int16_t)std::min(s, 32767);
    }
}

void sortMoves(Move* moves, int count) {
    // Insertion sort (small arrays, typically < 30 moves)
    for (int i = 1; i < count; i++) {
        Move key = moves[i];
        int j = i - 1;
        while (j >= 0 && moves[j].score < key.score) {
            moves[j + 1] = moves[j];
            j--;
        }
        moves[j + 1] = key;
    }
}

void pickMove(Move* moves, int count, int i) {
    // Find the move with the highest score from position i onward
    int best = i;
    for (int j = i + 1; j < count; j++) {
        if (moves[j].score > moves[best].score) best = j;
    }
    if (best != i) {
        Move tmp   = moves[i];
        moves[i]   = moves[best];
        moves[best] = tmp;
    }
}
