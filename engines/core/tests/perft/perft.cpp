#include "core/square_map.h"
#include "core/types.h"
#include "rules/variant.h"
#include "rules/movegen.h"
#include "board/position.h"
#include "board/makemove.h"
#include "board/hash.h"

#include <iostream>
#include <cstdlib>

// Recursive perft: count leaf nodes at given depth
static long long perft(Position& pos, int depth, const RuleConfig& rules) {
    if (depth == 0) return 1;

    Move moves[256];
    int count = 0;
    generateMoves(pos, rules, moves, count);

    if (count == 0) return 0;  // no moves = loss, counts as 0 leaves

    long long nodes = 0;
    for (int i = 0; i < count; i++) {
        Undo undo;
        makeMove(pos, moves[i], undo, rules);
        nodes += perft(pos, depth - 1, rules);
        unmakeMove(pos, moves[i], undo);
    }
    return nodes;
}

int main() {
    initSquareMaps();
    initZobrist();

    Position pos;
    initPosition(pos);
    pos.zobrist = computeHash(pos);

    const RuleConfig& rules = TANZANIA;

    // Expected Tanzania perft values from starting position
    // depth 1: 7 (white has 7 quiet moves)
    // depth 2: 49 (black has 7 responses each)
    const long long EXPECTED[3] = { 0, 7, 49 };

    bool allOk = true;
    for (int depth = 1; depth <= 2; depth++) {
        long long nodes = perft(pos, depth, rules);
        bool ok = (nodes == EXPECTED[depth]);
        std::cout << "perft(" << depth << ") = " << nodes;
        if (ok) std::cout << " OK";
        else    std::cout << " FAIL (expected " << EXPECTED[depth] << ")";
        std::cout << "\n";
        if (!ok) allOk = false;
    }

    // Run a few more depths for timing/sanity (no expected value check)
    for (int depth = 3; depth <= 5; depth++) {
        long long nodes = perft(pos, depth, rules);
        std::cout << "perft(" << depth << ") = " << nodes << "\n";
    }

    return allOk ? 0 : 1;
}
