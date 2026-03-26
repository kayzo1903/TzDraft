#include "search/search.h"
#include "search/qsearch.h"
#include "search/tt.h"
#include "search/killers.h"
#include "search/history.h"
#include "search/ordering.h"
#include "search/time.h"
#include "rules/movegen.h"
#include "rules/repetition.h"
#include "board/makemove.h"
#include "eval/eval.h"
#include <iostream>
#include <cstring>
#include <algorithm>

// Recursive negamax with alpha-beta pruning
int search(Position& pos, int depth, int alpha, int beta, int ply, SearchInfo& info) {
    if (info.stop || timeUp(info.tm)) {
        info.stop = true;
        return 0;
    }

    info.nodes++;

    // Draw conditions
    if (ply > 0 && isRepetitionHash(pos.zobrist, info.rules->repetitionThreshold)) {
        return 0;
    }
    if (pos.fiftyMove >= 40) {
        return 0;  // kings-only no-progress draw
    }

    // TT probe
    int ttScore = 0;
    Move ttMove; ttMove.from = 0xFF; ttMove.to = 0xFF;
    if (probeTT(pos.zobrist, depth, alpha, beta, ttScore, ttMove)) {
        return ttScore;
    }

    if (depth <= 0) {
        return qsearch(pos, alpha, beta, ply, info);
    }

    // Generate legal moves
    Move moves[256];
    int count = 0;
    generateMoves(pos, *info.rules, moves, count);

    if (count == 0) {
        // No legal moves = loss for side to move
        return -(WIN - ply);
    }

    // Score and order moves
    scoreMoves(moves, count, ttMove, pos.sideToMove, ply);

    Move bestMove = moves[0];
    int  bestScore = -INF;
    uint8_t ttFlag = TT_UPPERBOUND;

    for (int i = 0; i < count; i++) {
        pickMove(moves, count, i);
        const Move& m = moves[i];

        Undo undo;
        pushHash(pos.zobrist);
        makeMove(pos, m, undo, *info.rules);

        int score = -search(pos, depth - 1, -beta, -alpha, ply + 1, info);

        unmakeMove(pos, m, undo);
        popHash();

        if (info.stop) return 0;

        if (score > bestScore) {
            bestScore = score;
            bestMove  = m;
        }
        if (score > alpha) {
            alpha  = score;
            ttFlag = TT_EXACT;
        }
        if (alpha >= beta) {
            ttFlag = TT_LOWERBOUND;
            // Update killer and history for quiet moves
            if (m.capLen == 0) {
                storeKiller(ply, m);
                updateHistory(pos.sideToMove, m.from, m.to, depth);
            }
            break;
        }
    }

    storeTT(pos.zobrist, depth, bestScore, ttFlag, bestMove);
    return bestScore;
}

BestResult searchRoot(Position& pos, SearchInfo& info, int multiPV) {
    (void)multiPV;

    clearKillers();
    clearHistory();
    initTimeManager(info.tm, info.timeLimitMs, info.maxDepth, info.timeLimitMs <= 0 && info.maxDepth <= 0);

    info.nodes = 0;
    info.stop  = false;

    BestResult result;
    result.bestMove.from = 0xFF;
    result.score = 0;
    result.depth = 0;
    result.nodes = 0;

    int maxD = (info.maxDepth > 0) ? std::min(info.maxDepth, MAX_DEPTH) : MAX_DEPTH;

    for (int depth = 1; depth <= maxD; depth++) {
        int score = search(pos, depth, -INF, INF, 0, info);

        if (info.stop && depth > 1) break;

        // Probe TT for best move at root
        int dummy = 0;
        Move bestMove; bestMove.from = 0xFF;
        probeTT(pos.zobrist, depth, -INF, INF, dummy, bestMove);

        result.score = score;
        result.depth = depth;
        result.nodes = info.nodes;
        if (bestMove.from != 0xFF) result.bestMove = bestMove;

        // Output UCI-style info
        std::cout << "{\"type\":\"info\",\"depth\":" << depth
                  << ",\"score\":" << score
                  << ",\"nodes\":" << info.nodes
                  << "}\n";
        std::cout.flush();

        if (timeUp(info.tm)) break;
    }

    return result;
}
