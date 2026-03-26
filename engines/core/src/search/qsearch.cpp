#include "search/qsearch.h"
#include "search/search.h"
#include "search/ordering.h"
#include "rules/movegen.h"
#include "board/makemove.h"
#include "eval/eval.h"

int qsearch(Position& pos, int alpha, int beta, int ply, SearchInfo& info) {
    info.nodes++;

    // Generate captures only
    Move moves[256];
    int count = 0;
    generateCaptures(pos, *info.rules, moves, count);

    if (count == 0) {
        // No captures available. Position is quiet.
        return eval(pos, *info.rules);
    }

    // Apply majority-capture filter
    if (info.rules->maxCaptureRequired || info.rules->majorityCaptureMandatory) {
        int maxCaps = 0;
        for (int i = 0; i < count; i++) {
            if (moves[i].capLen > maxCaps) maxCaps = moves[i].capLen;
        }
        int retained = 0;
        for (int i = 0; i < count; i++) {
            if (moves[i].capLen == maxCaps) moves[retained++] = moves[i];
        }
        count = retained;
    }

    // Score and sort
    Move noTT; noTT.from = 0xFF; noTT.to = 0xFF;
    scoreMoves(moves, count, noTT, pos, ply);
    sortMoves(moves, count);

    int bestScore = -INF;

    for (int i = 0; i < count; i++) {
        Undo undo;
        makeMove(pos, moves[i], undo, *info.rules);
        int score = -qsearch(pos, -beta, -alpha, ply + 1, info);
        unmakeMove(pos, moves[i], undo);

        if (score > bestScore) bestScore = score;
        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
    }

    return bestScore;
}
