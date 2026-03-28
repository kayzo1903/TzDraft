#ifndef EVAL_KING_SAFETY_H
#define EVAL_KING_SAFETY_H

#include "core/types.h"
#include "rules/variant.h"

// King activity and safety from white's perspective
int evalKingSafety(const Position& pos, const RuleConfig& rules);

#endif // EVAL_KING_SAFETY_H
