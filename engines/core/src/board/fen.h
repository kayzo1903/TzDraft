#ifndef BOARD_FEN_H
#define BOARD_FEN_H

#include "core/types.h"
#include <string>

// Parse a PDN FEN string ("W:W21,22,K23:B1,2,K3") into a Position.
// Returns a properly hashed starting position when fen is empty.
Position parseFen(const std::string& fen);

// Serialize a Position to PDN FEN format.
std::string posToFen(const Position& pos);

#endif // BOARD_FEN_H
