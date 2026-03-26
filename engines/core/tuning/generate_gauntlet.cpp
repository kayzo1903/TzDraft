// generate_gauntlet.cpp — mass EPD generator for Texel tuning
//
// Plays Tanzania draughts self-play games, settling each position with
// qsearch (eliminating horizon effect), and writes dataset.epd for
// texel_tune.py.
//
// Build target: mkaguzi_gauntlet (see CMakeLists.txt)
// Usage:        ./mkaguzi_gauntlet [target_positions]

#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <random>
#include "core/square_map.h"
#include "board/position.h"
#include "board/hash.h"
#include "board/makemove.h"
#include "board/fen.h"
#include "rules/variant.h"
#include "rules/movegen.h"
#include "search/search.h"
#include "search/qsearch.h"
#include "search/tt.h"
#include "rules/repetition.h"

using namespace std;

static mt19937 rng(42);

struct EpdRecord {
    string fen;
    int    qscore;   // qsearch eval, white-relative (positive = white better)
    float  result;   // 1.0 = white win, 0.0 = black win, 0.5 = draw
};

// Pick a random legal move for opening randomisation
static Move pickRandomMove(Position& pos, const RuleConfig& rules) {
    Move moves[256];
    int count = 0;
    generateMoves(pos, rules, moves, count);
    if (count == 0) {
        Move empty; empty.from = 0xFF; empty.to = 0xFF;
        return empty;
    }
    uniform_int_distribution<int> dist(0, count - 1);
    return moves[dist(rng)];
}

// Play one self-play game at the given search depth.
// Collects qsearch-settled EPD records; result label filled at game end.
static void playGame(int depth, vector<EpdRecord>& out, const RuleConfig& rules) {
    Position pos;
    initPosition(pos);
    pos.zobrist = computeHash(pos);
    clearHashHistory();
    pushHash(pos.zobrist);

    // Randomise the first 3 half-moves to create opening diversity
    for (int i = 0; i < 3; i++) {
        Move rm = pickRandomMove(pos, rules);
        if (rm.from == 0xFF) return;
        Undo u;
        pushHash(pos.zobrist);
        makeMove(pos, rm, u, rules);
    }

    vector<EpdRecord> gameRecords;
    SearchInfo info;
    info.rules       = &rules;
    info.maxDepth    = depth;
    info.timeLimitMs = 0;   // fixed depth

    int  result          = -1;   // -1=unfinished, 1=white win, 0=black win, 2=draw
    int  quietMoveStreak = 0;
    int  maxMoves        = 200;

    while (maxMoves-- > 0) {
        // Settle the current position via qsearch (removes horizon effect)
        EpdRecord rec;
        rec.fen = posToFen(pos);
        info.stop  = false;
        info.nodes = 0;
        int raw = qsearch(pos, -INF, INF, 0, info);
        rec.qscore = (pos.sideToMove == 0) ? raw : -raw;   // white-relative
        gameRecords.push_back(rec);

        // Full search for the actual move
        info.stop  = false;
        info.nodes = 0;
        BestResult br = searchRoot(pos, info, 1);

        if (br.bestMove.from == 0xFF || br.score <= -(WIN - 100)) {
            result = (pos.sideToMove == 0) ? 0 : 1;   // no moves = loss
            break;
        }
        if (br.score >= (WIN - 100)) {
            result = (pos.sideToMove == 0) ? 1 : 0;
            break;
        }

        pushHash(pos.zobrist);
        Undo u;
        makeMove(pos, br.bestMove, u, rules);

        if (br.bestMove.capLen == 0 && !br.bestMove.promote) {
            quietMoveStreak++;
        } else {
            quietMoveStreak = 0;
        }

        if (quietMoveStreak >= 60) {
            result = 2;
            break;
        }
    }
    if (result == -1) result = 2;   // cap → draw

    float label = 0.5f;
    if (result == 1) label = 1.0f;
    if (result == 0) label = 0.0f;

    for (auto& r : gameRecords) {
        r.result = label;
        out.push_back(r);
    }

    clearHashHistory();
}

int main(int argc, char* argv[]) {
    initSquareMaps();
    initZobrist();
    clearTT();

    int targetPositions = 50000;
    if (argc > 1) targetPositions = atoi(argv[1]);

    cout << "Tanzania Draughts EPD generator — target: " << targetPositions << " positions\n";

    vector<EpdRecord> dataset;
    int gameCount = 0;

    while ((int)dataset.size() < targetPositions) {
        playGame(5, dataset, TANZANIA);
        gameCount++;
        if (gameCount % 25 == 0) {
            cout << "  games=" << gameCount
                 << "  positions=" << dataset.size() << "\n";
            cout.flush();
        }
    }

    const char* outPath = "dataset.epd";
    ofstream out(outPath);
    if (!out) {
        cerr << "Failed to open " << outPath << " for writing\n";
        return 1;
    }
    for (const auto& r : dataset) {
        out << r.fen << " | " << r.qscore << " | " << r.result << "\n";
    }
    out.close();

    cout << "Written " << dataset.size() << " EPD records to " << outPath << "\n";
    return 0;
}
