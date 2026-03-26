#ifndef RULES_MOVEGEN_H
#define RULES_MOVEGEN_H

#include "core/types.h"
#include "rules/variant.h"

// Generate all legal moves (captures first; if none, quiet moves).
// Results written into out[], count set to number of moves.
void generateMoves(const Position& pos, const RuleConfig& rules, Move* out, int& count);

// Generate only capture moves
void generateCaptures(const Position& pos, const RuleConfig& rules, Move* out, int& count);

// Generate only quiet (non-capture) moves
void generateQuiets(const Position& pos, const RuleConfig& rules, Move* out, int& count);

#endif // RULES_MOVEGEN_H
