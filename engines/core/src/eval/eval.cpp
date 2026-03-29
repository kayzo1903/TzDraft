#include "eval/eval.h"
#include "eval/material.h"
#include "eval/mobility.h"
#include "eval/tempo.h"
#include "eval/structure.h"
#include "eval/king_safety.h"
#include "eval/patterns.h"
#include "search/search.h"
#include "board/position.h"
#include "core/bitboard.h"

#include <random>

// Side-to-move relative material score
int evalMaterial(const Position& pos, const SearchInfo* info) {
    int kingValue = KING_VALUE;
    if (info && info->level < 19) {
        // Levels 15-18: reduced king value to make promotion less of an overriding obsession
        // 15: 250, 16: 265, 17: 280, 18: 292
        if      (info->level == 18) kingValue = 292;
        else if (info->level == 17) kingValue = 280;
        else if (info->level == 16) kingValue = 265;
        else                        kingValue = 250;
    }

    int white = popcount(pos.whiteMen)   * MAN_VALUE
              + popcount(pos.whiteKings) * kingValue;
    int black = popcount(pos.blackMen)   * MAN_VALUE
              + popcount(pos.blackKings) * kingValue;
    return white - black;
}

// Master eval: all sub-evals return white-relative scores.
// We negate at the end if it's black's turn (negamax convention).
int eval(const Position& pos, const RuleConfig& rules, const SearchInfo* info) {
    int score = 0;
    score += evalMaterial(pos, info);
    score += evalMobility(pos, rules);
    score += evalTempo(pos);
    score += evalStructure(pos);
    score += evalKingSafety(pos, rules);
    score += evalPatterns(pos);

    // Add noise if level < 19
    if (info && info->randomness > 0) {
        static thread_local std::mt19937 gen(std::random_device{}());
        std::uniform_int_distribution<> dist(-info->randomness, info->randomness);
        score += dist(gen);
    }

    // Return from side-to-move perspective
    return (pos.sideToMove == 0) ? score : -score;
}

EvalTrace evalTrace(const Position& pos, const RuleConfig& rules) {
    EvalTrace t;
    t.material   = evalMaterial(pos, nullptr);
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
