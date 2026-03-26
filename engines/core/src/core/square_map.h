#ifndef CORE_SQUARE_MAP_H
#define CORE_SQUARE_MAP_H

#include <cstdint>

// Initialize all square-to-square direction tables.
// Must be called once at engine startup before any move generation.
void initSquareMaps();

// Helper: convert (row, col) to square index (0-31), returns -1 if invalid.
// Valid when 0<=row<=7, 0<=col<=7, (row+col) is odd.
int rcToSq(int row, int col);

// Helper: get row from square index
int sqRow(int sq);

// Helper: get col from square index
int sqCol(int sq);

#endif // CORE_SQUARE_MAP_H
