#ifndef RULES_CAPTUREGEN_H
#define RULES_CAPTUREGEN_H

#include "core/types.h"
#include "rules/variant.h"

// Generate all capture moves for the current position.
// Results written to out[], count updated.
void generateCaptures(const Position& pos, const RuleConfig& rules, Move* out, int& count);

#endif // RULES_CAPTUREGEN_H
