#include "eval/material.h"
#include "eval/eval.h"
#include "core/bitboard.h"

int evalMaterial(const Position& pos) {
    int white = popcount(pos.whiteMen)   * MAN_VALUE
              + popcount(pos.whiteKings) * KING_VALUE;
    int black = popcount(pos.blackMen)   * MAN_VALUE
              + popcount(pos.blackKings) * KING_VALUE;
    return white - black;
}
