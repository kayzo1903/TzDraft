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
        Position before = pos;
        uint64_t beforeHash = pos.zobrist;
        Undo undo;
        makeMove(pos, moves[i], undo, rules);
        nodes += perft(pos, depth - 1, rules);
        unmakeMove(pos, moves[i], undo);

        bool restored =
            pos.whiteMen   == before.whiteMen &&
            pos.whiteKings == before.whiteKings &&
            pos.blackMen   == before.blackMen &&
            pos.blackKings == before.blackKings &&
            pos.sideToMove == before.sideToMove &&
            pos.ply        == before.ply &&
            pos.fiftyMove  == before.fiftyMove &&
            pos.zobrist    == beforeHash;

        if (!restored) {
            std::cerr << "make/unmake corruption detected at depth " << depth << "\n";
            std::exit(2);
        }
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
    // These are locked baseline regression counts for the current engine.
    const long long EXPECTED[6] = { 0, 7, 49, 302, 1469, 7361 };

    bool allOk = true;
    for (int depth = 1; depth <= 5; depth++) {
        long long nodes = perft(pos, depth, rules);
        bool ok = (nodes == EXPECTED[depth]);
        std::cout << "perft(" << depth << ") = " << nodes;
        if (ok) std::cout << " OK";
        else    std::cout << " FAIL (expected " << EXPECTED[depth] << ")";
        std::cout << "\n";
        if (!ok) allOk = false;
    }

    return allOk ? 0 : 1;
}
