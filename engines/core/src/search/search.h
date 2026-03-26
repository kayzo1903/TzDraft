#ifndef SEARCH_SEARCH_H
#define SEARCH_SEARCH_H

#include "core/types.h"
#include "rules/variant.h"
#include "search/time.h"
#include <string>

constexpr int WIN       = 30000;
constexpr int INF       = 32000;
constexpr int MAX_DEPTH = 64;

struct SearchInfo {
    const RuleConfig* rules;
    int  maxDepth;
    int  timeLimitMs;
    bool stop;
    long long nodes;
    TimeManager tm;
};

struct BestResult {
    Move  bestMove;
    int   score;
    int   depth;
    long long nodes;
};

void requestSearchStop();
void clearSearchStop();
bool searchStopRequested();

// Root search: iterative deepening, returns best result
BestResult searchRoot(Position& pos, SearchInfo& info, int multiPV);

// Recursive negamax with alpha-beta
int search(Position& pos, int depth, int alpha, int beta, int ply, SearchInfo& info);

#endif // SEARCH_SEARCH_H
