#include "eval/tempo.h"
#include "eval/eval.h"

int evalTempo(const Position& pos) {
    return (pos.sideToMove == 0) ? TEMPO_BONUS : -TEMPO_BONUS;
}
