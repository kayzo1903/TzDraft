#ifndef SEARCH_ORDERING_H
#define SEARCH_ORDERING_H

#include "core/types.h"

// Score all moves in the array for ordering purposes.
// ttMove: the best move from the TT (from==0xFF means none)
// side: 0=white, 1=black
// ply: current search ply
void scoreMoves(Move* moves, int count, const Move& ttMove, int side, int ply);

// Sort moves in descending order by score (simple insertion sort — count is small)
void sortMoves(Move* moves, int count);

// Pick the next best move (partial selection sort — swap best to position i)
void pickMove(Move* moves, int count, int i);

#endif // SEARCH_ORDERING_H
