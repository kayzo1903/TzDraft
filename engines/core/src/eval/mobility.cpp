#include "eval/mobility.h"
#include "rules/movegen.h"
#include <cstring>

int evalMobility(const Position& pos, const RuleConfig& rules) {
    Move moveBuf[256];
    int count = 0;

    // Count white quiet moves
    Position wpos = pos;
    wpos.sideToMove = 0;
    generateQuiets(wpos, rules, moveBuf, count);
    int whiteMoves = count;

    // Count black quiet moves
    count = 0;
    Position bpos = pos;
    bpos.sideToMove = 1;
    generateQuiets(bpos, rules, moveBuf, count);
    int blackMoves = count;

    return (whiteMoves - blackMoves) * 3;
}
