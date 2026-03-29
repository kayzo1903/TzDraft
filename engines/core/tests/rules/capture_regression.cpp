#include "core/square_map.h"
#include "rules/variant.h"
#include "rules/movegen.h"
#include "board/fen.h"
#include "board/hash.h"

#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

static std::string moveKey(const Move& m) {
    std::string key = std::to_string((int)m.from + 1);
    key += "-";
    key += std::to_string((int)m.to + 1);
    key += "-";
    for (int i = 0; i < (int)m.capLen; ++i) {
        if (i > 0) key += ".";
        key += std::to_string((int)m.captures[i] + 1);
    }
    return key;
}

static std::vector<std::string> collectMoveKeys(const std::string& fen) {
    Position pos = parseFen(fen);
    Move moves[256];
    int count = 0;
    generateMoves(pos, TANZANIA, moves, count);

    std::vector<std::string> keys;
    keys.reserve(count);
    for (int i = 0; i < count; ++i) {
        keys.push_back(moveKey(moves[i]));
    }
    std::sort(keys.begin(), keys.end());
    return keys;
}

static bool expectMoves(
    const std::string& fen,
    const std::vector<std::string>& expected,
    const char* label)
{
    std::vector<std::string> actual = collectMoveKeys(fen);
    std::vector<std::string> sortedExpected = expected;
    std::sort(sortedExpected.begin(), sortedExpected.end());

    if (actual == sortedExpected) {
        std::cout << label << " OK\n";
        return true;
    }

    std::cerr << label << " FAIL\n";
    std::cerr << "  FEN: " << fen << "\n";
    std::cerr << "  Expected:";
    for (const auto& key : sortedExpected) std::cerr << " " << key;
    std::cerr << "\n";
    std::cerr << "  Actual:";
    for (const auto& key : actual) std::cerr << " " << key;
    std::cerr << "\n";
    return false;
}

int main() {
    initSquareMaps();
    initZobrist();

    bool ok = true;

    // Art. 4.6: if a king lands on the first square that enables a further
    // capture, it must continue; later landings beyond that point are illegal.
    ok &= expectMoves(
        "W:WK1:B6,7",
        {"1-3-6.7"},
        "forced-king-continuation");

    // Art. 4.9: free choice means distinct complete sequences remain legal even
    // when one captures more pieces than another. Only the complete 2-piece and
    // 3-piece routes are legal here.
    ok &= expectMoves(
        "W:WK1:B6,14,25",
        {"1-17-6.14", "1-30-6.14.25"},
        "free-choice-complete-sequences");

    return ok ? 0 : 1;
}
