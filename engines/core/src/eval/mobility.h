#ifndef EVAL_MOBILITY_H
#define EVAL_MOBILITY_H

#include "core/types.h"
#include "rules/variant.h"

// Returns (white_moves - black_moves) * 3
int evalMobility(const Position& pos, const RuleConfig& rules);

#endif // EVAL_MOBILITY_H
