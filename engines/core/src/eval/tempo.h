#ifndef EVAL_TEMPO_H
#define EVAL_TEMPO_H

#include "core/types.h"

// Returns +TEMPO_BONUS if white to move, -TEMPO_BONUS if black to move (white's perspective)
int evalTempo(const Position& pos);

#endif // EVAL_TEMPO_H
