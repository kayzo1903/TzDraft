#ifndef EVAL_MATERIAL_H
#define EVAL_MATERIAL_H

#include "core/types.h"

// Returns white_material - black_material in centipawns
struct Position;
struct SearchInfo;

int evalMaterial(const Position& pos, const SearchInfo* info = nullptr);

#endif // EVAL_MATERIAL_H
