#include "search/killers.h"
#include <cstring>

Move killerMoves[MAX_KILLER_PLY][2];

void clearKillers() {
    memset(killerMoves, 0, sizeof(killerMoves));
}

void storeKiller(int ply, const Move& m) {
    if (ply < 0 || ply >= MAX_KILLER_PLY) return;
    // Don't store duplicate
    if (killerMoves[ply][0].from == m.from && killerMoves[ply][0].to == m.to) return;
    // Shift slot 0 to slot 1, store new in slot 0
    killerMoves[ply][1] = killerMoves[ply][0];
    killerMoves[ply][0] = m;
}

bool isKiller(int ply, const Move& m) {
    if (ply < 0 || ply >= MAX_KILLER_PLY) return false;
    for (int i = 0; i < 2; i++) {
        if (killerMoves[ply][i].from == m.from &&
            killerMoves[ply][i].to   == m.to) {
            return true;
        }
    }
    return false;
}
