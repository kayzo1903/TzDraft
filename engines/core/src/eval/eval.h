#ifndef EVAL_EVAL_H
#define EVAL_EVAL_H

#include "core/types.h"
#include "rules/variant.h"
#include "board/position.h"

// Piece values
constexpr int MAN_VALUE  = 122;
constexpr int KING_VALUE = 226;
constexpr int TEMPO_BONUS = 22;

struct EvalTrace {
    int material;
    int mobility;
    int structure;
    int patterns;
    int kingSafety;
    int tempo;
    int total;
};

struct SearchInfo;

// Master eval: returns score in centipawns from side-to-move perspective
int eval(const Position& pos, const RuleConfig& rules, const SearchInfo* info = nullptr);

// Same but fills in trace struct for debugging
EvalTrace evalTrace(const Position& pos, const RuleConfig& rules);

#endif // EVAL_EVAL_H
