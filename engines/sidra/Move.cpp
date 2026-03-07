#include "Checkers.h"

void MakeMove(Move *m, unsigned ply)
{
	unsigned i;

	Nodes++;

	// A move is "reversible" (for the 30-move rule) only when a king moves
	// without capturing — i.e. no man moves and no captures.
	Reversible[ply] = (Board[m->from] & KING) && !m->cap_sq[0];

	// Save current hash to undo stack before modifying the board
	HashStack[HashSP++] = CurrentHash;

	// XOR out the piece leaving its origin square
	CurrentHash ^= ZobristTable[m->from][Board[m->from] & 7];

	// Move the piece (with optional promotion)
	if (m->promotion) Board[m->to] = Board[m->from] | KING;
	else              Board[m->to] = Board[m->from];
	if (m->from != m->to) Board[m->from] = 0;

	// XOR in the piece arriving at its destination
	CurrentHash ^= ZobristTable[m->to][Board[m->to] & 7];

	// Remove captured pieces from board and hash
	for (i = 0; m->cap_sq[i]; i++)
	{
		// cap_type[i] holds the piece value recorded at move-generation time
		CurrentHash ^= ZobristTable[m->cap_sq[i]][m->cap_type[i] & 7];
		Board[m->cap_sq[i]] = 0;
	}
	Pieces -= i;

	// Flip side-to-move in both the board state and the hash
	CurrentHash ^= ZobristSTM;
	stm ^= CHANGE_COLOR;
}

void UnmakeMove(Move *m)
{
	unsigned i;

	stm ^= CHANGE_COLOR;

	// Restore captured pieces
	for (i = 0; m->cap_sq[i]; i++)
		Board[m->cap_sq[i]] = m->cap_type[i];
	Pieces += i;

	// Restore moving piece (undo promotion if it occurred)
	if (m->promotion) Board[m->from] = stm; // was a man (just stm color, no KING bit)
	else              Board[m->from] = Board[m->to];
	if (m->from != m->to) Board[m->to] = 0;

	// Restore hash from the undo stack — fastest and most reliable
	CurrentHash = HashStack[--HashSP];
}
