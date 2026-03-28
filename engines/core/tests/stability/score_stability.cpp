// score_stability.cpp — PVS / Aspiration Window regression harness
//
// For each test position, runs searchRoot at depth N and depth N+1 and
// asserts the scores agree within ±15 centipawns.  A larger swing means
// the PVS zero-window or the aspiration window re-search logic has a bug
// that is inflating or deflating scores across depths.
//
// Build target: mkaguzi_stability (see CMakeLists.txt)
// Usage:        ./mkaguzi_stability

#include <iostream>
#include <vector>
#include <string>
#include <cmath>
#include <cstdlib>
#include "core/square_map.h"
#include "board/position.h"
#include "board/hash.h"
#include "board/fen.h"
#include "rules/variant.h"
#include "search/search.h"
#include "search/tt.h"
#include "rules/repetition.h"

using namespace std;

struct TestCase {
    string name;
    string fen;
};

// Run searchRoot at the given depth, return score.
static int evalAt(const string& fen, int depth, const RuleConfig& rules) {
    clearTT();
    clearHashHistory();

    Position pos = parseFen(fen);
    pushHash(pos.zobrist);

    SearchInfo info;
    info.rules       = &rules;
    info.maxDepth    = depth;
    info.timeLimitMs = 0;
    info.stop        = false;
    info.nodes       = 0;

    BestResult br = searchRoot(pos, info, 1);
    return br.score;
}

int main() {
    initSquareMaps();
    initZobrist();

    // ---------------------------------------------------------------
    // Test suite — add your 20 standard EPD/FEN positions here.
    // Each position is searched at depth 6 and depth 7; if the scores
    // differ by more than 15 cp the test fails (PVS integrity check).
    // ---------------------------------------------------------------
    vector<TestCase> suite = {
        {
            "Initial position",
            "W:W21,22,23,24,25,26,27,28,29,30,31,32:B1,2,3,4,5,6,7,8,9,10,11,12"
        },
        {
            "White up one man",
            "W:W18,22,23,24,25,26,27,28,30,31,32:B1,2,3,5,6,7,9,10,11,12"
        },
        {
            "Balanced mid-game",
            "B:W15,18,22,24,26,27,28,30:B5,7,9,11,13,14,17,19"
        },
        {
            "King endgame — two kings each",
            "W:WK14,K26:BK10,K20"
        },
        {
            "White five vs two — dominant",
            "W:W21,22,23,25,26:B9,10"
        },
        {
            "Two kings each — symmetric draw",
            "W:WK5,K18:BK14,K27"
        },
        {
            "White four men vs black two — dominant",
            "W:W22,25,26,27:B9,10"
        },
        {
            "White king dominates center",
            "W:WK18,25,26,27:B5,7,9,11"
        },
        {
            "Two kings vs one king",
            "W:WK5,K18:BK14"
        },
        {
            "White up two men — clear advantage",
            "W:W18,22,23,24,25:B5,7,9"
        },
        {
            "King and man vs lone king",
            "W:WK14,22:BK10"
        },
        {
            "Four vs two — edge advantage",
            "W:W22,23,26,27:B9,10"
        },
        {
            "White promotion threat",
            "W:W13,22,24,26:B5,7,10,11"
        },
        {
            "Two men vs one man",
            "W:W22,24:B9"
        },
        {
            "Two black kings vs two white men",
            "W:W22,24:BK10,K14"
        },
        {
            "King each — open board",
            "W:WK16:BK9"
        },
        {
            "Three vs three — symmetric",
            "W:W23,24,25:B8,9,10"
        },
        {
            "White five men vs black three — winning",
            "W:W22,23,24,25,26:B9,10,11"
        },
        {
            "Two men each — symmetric endgame",
            "W:W22,24:B9,11"
        },
    };
    // ---------------------------------------------------------------

    constexpr int BASE_DEPTH  = 6;
    constexpr int CHECK_DEPTH = 7;
    constexpr int MARGIN      = 15;

    int passed = 0;
    int total  = static_cast<int>(suite.size());

    cout << "Score Stability Regression Suite (depth " << BASE_DEPTH
         << " vs " << CHECK_DEPTH << ", margin ±" << MARGIN << " cp)\n";
    cout << string(70, '-') << "\n";

    for (const auto& tc : suite) {
        int s6 = evalAt(tc.fen, BASE_DEPTH,  TANZANIA);
        int s7 = evalAt(tc.fen, CHECK_DEPTH, TANZANIA);
        int diff = abs(s7 - s6);

        if (diff <= MARGIN) {
            cout << "[PASS] " << tc.name
                 << "  d" << BASE_DEPTH  << "=" << s6
                 << "  d" << CHECK_DEPTH << "=" << s7
                 << "  Δ=" << diff << "\n";
            passed++;
        } else {
            cout << "[FAIL] " << tc.name
                 << "  d" << BASE_DEPTH  << "=" << s6
                 << "  d" << CHECK_DEPTH << "=" << s7
                 << "  Δ=" << diff << " (exceeds " << MARGIN << " cp)\n";
        }
    }

    cout << string(70, '-') << "\n";
    cout << "Result: " << passed << "/" << total << " passed\n";

    if (passed == total) {
        cout << "PVS + Aspiration Windows: all scores stable across depths.\n";
        return 0;
    }
    return 1;
}
