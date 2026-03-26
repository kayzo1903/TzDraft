#include "eval/eval.h"
#include "eval/material.h"
#include "eval/mobility.h"
#include "eval/tempo.h"
#include "eval/structure.h"
#include "eval/king_safety.h"
#include "eval/patterns.h"

// Master eval: all sub-evals return white-relative scores.
// We negate at the end if it's black's turn (negamax convention).
int eval(const Position& pos, const RuleConfig& rules) {
    int score = 0;
    score += evalMaterial(pos);
    score += evalMobility(pos, rules);
    score += evalTempo(pos);
    score += evalStructure(pos);
    score += evalKingSafety(pos, rules);
    score += evalPatterns(pos);

    // Return from side-to-move perspective
    return (pos.sideToMove == 0) ? score : -score;
}

EvalTrace evalTrace(const Position& pos, const RuleConfig& rules) {
    EvalTrace t;
    t.material   = evalMaterial(pos);
    t.mobility   = evalMobility(pos, rules);
    t.tempo      = evalTempo(pos);
    t.structure  = evalStructure(pos);
    t.kingSafety = evalKingSafety(pos, rules);
    t.patterns   = evalPatterns(pos);
    t.total      = t.material + t.mobility + t.tempo + t.structure + t.kingSafety + t.patterns;
    // total is white-relative; for side-to-move:
    if (pos.sideToMove == 1) t.total = -t.total;
    return t;
}
