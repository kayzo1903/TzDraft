#ifndef BOARD_MAKEMOVE_H
#define BOARD_MAKEMOVE_H

#include "core/types.h"
#include "rules/variant.h"

void makeMove(Position& pos, const Move& m, Undo& undo, const RuleConfig& rules);
void unmakeMove(Position& pos, const Move& m, const Undo& undo);

#endif // BOARD_MAKEMOVE_H
