#ifndef SEARCH_KILLERS_H
#define SEARCH_KILLERS_H

#include "core/types.h"

constexpr int MAX_KILLER_PLY = 64;

// Two killer move slots per ply
extern Move killerMoves[MAX_KILLER_PLY][2];

void clearKillers();
void storeKiller(int ply, const Move& m);
bool isKiller(int ply, const Move& m);

#endif // SEARCH_KILLERS_H
