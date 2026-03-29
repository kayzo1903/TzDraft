#include "core/square_map.h"
#include "rules/variant.h"
#include "board/fen.h"
#include "board/hash.h"
#include "eval/eval.h"

#include <iostream>

static bool expectScore(const char* label, const std::string& fen, bool shouldBePositive) {
    Position pos = parseFen(fen);
    int score = eval(pos, TANZANIA, nullptr);
    bool ok = shouldBePositive ? (score > 0) : (score < 0);

    if (ok) {
        std::cout << label << " OK (" << score << ")\n";
        return true;
    }

    std::cerr << label << " FAIL (" << score << ")\n";
    std::cerr << "  FEN: " << fen << "\n";
    return false;
}

int main() {
    initSquareMaps();
    initZobrist();

    bool ok = true;

    // White runner is close to promotion while black is still far away.
    ok &= expectScore("white-promotion-race", "W:W5:B29", true);

    // Black runner is close to promotion while white is still on the home side.
    ok &= expectScore("black-promotion-race", "W:W29:B25", false);

    return ok ? 0 : 1;
}
