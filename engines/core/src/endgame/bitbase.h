#ifndef ENDGAME_BITBASE_H
#define ENDGAME_BITBASE_H

#include "core/types.h"

enum class BitbaseResult { WIN, DRAW, LOSS, UNKNOWN };

// Probe the endgame bitbase. Returns UNKNOWN if not available.
BitbaseResult probeBitbase(const Position& pos);

#endif // ENDGAME_BITBASE_H
