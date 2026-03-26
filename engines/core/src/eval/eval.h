#ifndef EVAL_EVAL_H
#define EVAL_EVAL_H

#include "core/types.h"
#include "rules/variant.h"

// Piece values
constexpr int MAN_VALUE  = 100;
constexpr int KING_VALUE = 300;
constexpr int TEMPO_BONUS = 10;

struct EvalTrace {
    int material;
    int mobility;
    int structure;
    int patterns;
    int kingSafety;
    int tempo;
    int total;
};

// Master eval: returns score in centipawns from side-to-move perspective
int eval(const Position& pos, const RuleConfig& rules);

// Same but fills in trace struct for debugging
EvalTrace evalTrace(const Position& pos, const RuleConfig& rules);

#endif // EVAL_EVAL_H
