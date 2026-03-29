#include <cstring>
#include <iostream>

extern "C" {
void mkz_init();
const char* mkz_game_result(const char* fen, int fifty_moves, int three_kings_count, int endgame_count);
}

static bool expectContains(
    const char* label,
    const char* fen,
    int fiftyMoves,
    int threeKingsCount,
    int endgameCount,
    const char* expected)
{
    const char* actual = mkz_game_result(fen, fiftyMoves, threeKingsCount, endgameCount);
    if (std::strstr(actual, expected) != nullptr) {
        std::cout << label << " OK\n";
        return true;
    }

    std::cerr << label << " FAIL\n";
    std::cerr << "  FEN: " << fen << "\n";
    std::cerr << "  Expected substring: " << expected << "\n";
    std::cerr << "  Actual: " << actual << "\n";
    return false;
}

int main() {
    mkz_init();

    bool ok = true;

    ok &= expectContains(
        "k-vs-k-insufficient",
        "W:WK18:BK27",
        0,
        0,
        0,
        "\"reason\":\"insufficient_material\"");

    ok &= expectContains(
        "two-kings-vs-king-not-immediate-draw",
        "W:WK18,K22:BK27",
        0,
        0,
        0,
        "\"status\":\"ongoing\"");

    ok &= expectContains(
        "three-kings-vs-king-not-immediate-draw",
        "W:WK1,K5,K18:BK32",
        0,
        0,
        0,
        "\"status\":\"ongoing\"");

    ok &= expectContains(
        "thirty-move-rule-at-59-halfmoves",
        "W:WK18,K22:BK27",
        59,
        0,
        0,
        "\"status\":\"ongoing\"");

    ok &= expectContains(
        "thirty-move-rule-at-60-halfmoves",
        "W:WK18,K22:BK27",
        60,
        0,
        0,
        "\"reason\":\"thirty_move\"");

    ok &= expectContains(
        "three-kings-rule-at-11",
        "W:WK1,K5,K18:BK32",
        0,
        11,
        0,
        "\"status\":\"ongoing\"");

    ok &= expectContains(
        "three-kings-rule-at-12",
        "W:WK1,K5,K18:BK32",
        0,
        12,
        0,
        "\"reason\":\"three_kings\"");

    ok &= expectContains(
        "article84-at-9-halfmoves",
        "W:WK18,K22:BK27",
        0,
        0,
        9,
        "\"status\":\"ongoing\"");

    ok &= expectContains(
        "article84-at-10-halfmoves",
        "W:WK18,K22:BK27",
        0,
        0,
        10,
        "\"reason\":\"endgame\"");

    return ok ? 0 : 1;
}
