#include "search/search.h"
#include "search/qsearch.h"
#include "search/tt.h"
#include "search/killers.h"
#include "search/history.h"
#include "search/ordering.h"
#include "search/time.h"
#include "rules/movegen.h"
#include "rules/repetition.h"
#include "board/makemove.h"
#include "eval/eval.h"
#include <iostream>
#include <cstdio>
#include <cstring>
#include <algorithm>
#include <string>
#include <atomic>

// Contempt: engine treats a drawn position as slightly bad from its own perspective.
// Keep this well below MAN_VALUE (100) — otherwise the engine sacrifices pieces to
// avoid draws, which is far worse than accepting them.
constexpr int CONTEMPT = 20;
static std::atomic<bool> g_stopRequested{false};

void requestSearchStop() {
    g_stopRequested.store(true, std::memory_order_relaxed);
}

void clearSearchStop() {
    g_stopRequested.store(false, std::memory_order_relaxed);
}

bool searchStopRequested() {
    return g_stopRequested.load(std::memory_order_relaxed);
}

static std::string moveToStr(const Move& m) {
    if (m.from == 0xFF) return "0000";
    char buf[32];
    std::snprintf(buf, sizeof(buf), "%02d%02d", (int)m.from + 1, (int)m.to + 1);
    return std::string(buf);
}

static std::string buildPvJson(Position& pos, const RuleConfig& rules, int maxPly) {
    std::string out = "[";
    Undo undos[MAX_DEPTH];
    Move pvMoves[MAX_DEPTH];
    int emitted = 0;

    for (int ply = 0; ply < maxPly && ply < MAX_DEPTH; ++ply) {
        int dummy = 0;
        Move ttMove;
        ttMove.from = 0xFF;
        ttMove.to = 0xFF;
        probeTT(pos.zobrist, 0, -INF, INF, dummy, ttMove);
        if (ttMove.from == 0xFF) {
            break;
        }

        if (emitted > 0) out += ",";
        out += "\"";
        out += moveToStr(ttMove);
        out += "\"";

        pvMoves[emitted] = ttMove;
        makeMove(pos, ttMove, undos[emitted], rules);
        emitted++;
    }

    for (int i = emitted - 1; i >= 0; --i) {
        unmakeMove(pos, pvMoves[i], undos[i]);
    }

    out += "]";
    return out;
}

static std::string buildPvJsonFromRootMove(Position& pos, const RuleConfig& rules,
                                          const Move& rootMove, int maxPly) {
    if (rootMove.from == 0xFF) return "[]";

    std::string out = "[\"";
    out += moveToStr(rootMove);
    out += "\"";

    if (maxPly > 1) {
        Undo undo;
        makeMove(pos, rootMove, undo, rules);
        std::string tail = buildPvJson(pos, rules, maxPly - 1);
        unmakeMove(pos, rootMove, undo);

        if (tail.size() > 2) {
            out += ",";
            out += tail.substr(1, tail.size() - 2);
        }
    }

    out += "]";
    return out;
}

struct RootLine {
    Move move;
    int score;
    std::string pvJson;
};

static void insertRootLine(RootLine* lines, int& lineCount, int maxLines, const RootLine& candidate) {
    int insertAt = lineCount;
    for (int i = 0; i < lineCount; ++i) {
        if (candidate.score > lines[i].score) {
            insertAt = i;
            break;
        }
    }

    if (insertAt >= maxLines) {
        return;
    }

    int newCount = std::min(lineCount + 1, maxLines);
    for (int i = newCount - 1; i > insertAt; --i) {
        lines[i] = lines[i - 1];
    }
    lines[insertAt] = candidate;
    lineCount = newCount;
}

// Recursive negamax with alpha-beta pruning
int search(Position& pos, int depth, int alpha, int beta, int ply, SearchInfo& info) {
    if (info.stop || searchStopRequested() || timeUp(info.tm)) {
        info.stop = true;
        return 0;
    }

    info.nodes++;

    // Draw conditions — return -CONTEMPT so the engine avoids draws when winning
    if (ply > 0 && isRepetitionHash(pos.zobrist, info.rules->repetitionThreshold)) {
        return -CONTEMPT;
    }
    if (pos.fiftyMove >= 60) {
        return -CONTEMPT;
    }

    // TT probe
    int ttScore = 0;
    Move ttMove; ttMove.from = 0xFF; ttMove.to = 0xFF;
    if (probeTT(pos.zobrist, depth, alpha, beta, ttScore, ttMove)) {
        return ttScore;
    }

    if (depth <= 0) {
        return qsearch(pos, alpha, beta, ply, info);
    }

    // Generate legal moves
    Move moves[256];
    int count = 0;
    generateMoves(pos, *info.rules, moves, count);

    if (count == 0) {
        // No legal moves = loss for side to move
        return -(WIN - ply);
    }

    // Score and order moves
    scoreMoves(moves, count, ttMove, pos, ply);

    Move bestMove = moves[0];
    int  bestScore = -INF;
    uint8_t ttFlag = TT_UPPERBOUND;

    for (int i = 0; i < count; i++) {
        pickMove(moves, count, i);
        const Move& m = moves[i];

        Undo undo;
        pushHash(pos.zobrist);
        makeMove(pos, m, undo, *info.rules);

        // PVS and LMR
        int score;
        const int newDepth = depth - 1;  // no promotion extension — promotion reward is in eval
        bool doFullSearch = false;

        if (depth >= 2 && i > 0) {
            if (i >= 3 && depth >= 3 && m.capLen == 0 && !m.promote) {
                int R = (i >= 6) ? 2 : 1;
                score = -search(pos, newDepth - R, -alpha - 1, -alpha, ply + 1, info);
                if (!info.stop && score > alpha) {
                    score = -search(pos, newDepth, -alpha - 1, -alpha, ply + 1, info);
                    if (!info.stop && score > alpha && score < beta) {
                        doFullSearch = true;
                    }
                }
            } else {
                score = -search(pos, newDepth, -alpha - 1, -alpha, ply + 1, info);
                if (!info.stop && score > alpha && score < beta) {
                    doFullSearch = true;
                }
            }
        } else {
            doFullSearch = true;
        }

        if (doFullSearch) {
            score = -search(pos, newDepth, -beta, -alpha, ply + 1, info);
        }

        unmakeMove(pos, m, undo);
        popHash();

        if (info.stop) return 0;

        if (score > bestScore) {
            bestScore = score;
            bestMove  = m;
        }
        if (score > alpha) {
            alpha  = score;
            ttFlag = TT_EXACT;
        }
        if (alpha >= beta) {
            ttFlag = TT_LOWERBOUND;
            // Update killer and history for quiet moves
            if (m.capLen == 0) {
                storeKiller(ply, m);
                updateHistory(pos.sideToMove, m.from, m.to, depth);
            }
            break;
        }
    }

    storeTT(pos.zobrist, depth, bestScore, ttFlag, bestMove);
    return bestScore;
}

BestResult searchRoot(Position& pos, SearchInfo& info, int multiPV) {
    clearKillers();
    clearHistory();
    clearSearchStop();
    incrementTTAge();
    pushHash(pos.zobrist);
    initTimeManager(info.tm, info.timeLimitMs, info.maxDepth, info.timeLimitMs <= 0 && info.maxDepth <= 0, pos.fullMove);

    info.nodes = 0;
    info.stop  = false;

    BestResult result;
    result.bestMove.from = 0xFF;
    result.score = 0;
    result.depth = 0;
    result.nodes = 0;

    int maxD = (info.maxDepth > 0) ? std::min(info.maxDepth, MAX_DEPTH) : MAX_DEPTH;
    int rootMultiPV = std::max(1, multiPV);

    Move rootMoves[256];
    int rootCount = 0;
    generateMoves(pos, *info.rules, rootMoves, rootCount);
    if (rootCount == 0) {
        result.score = -WIN;
        popHash();
        return result;
    }

    // Forced move: only one legal move, no need to search
    if (rootCount == 1) {
        result.bestMove = rootMoves[0];
        result.depth = 0;
        result.nodes = 0;
        popHash();
        return result;
    }

    Move ttMove;
    ttMove.from = 0xFF;
    ttMove.to = 0xFF;
    int ttScore = 0;
    probeTT(pos.zobrist, 0, -INF, INF, ttScore, ttMove);
    scoreMoves(rootMoves, rootCount, ttMove, pos, 0);
    sortMoves(rootMoves, rootCount);

    int lastScore = 0;

    for (int depth = 1; depth <= maxD; depth++) {
        RootLine bestLines[32];
        int bestLineCount = 0;

        int windowAlpha = -INF;
        int windowBeta  = INF;

        // Aspiration Windows
        if (depth >= 2 && rootMultiPV <= 1) {
            windowAlpha = lastScore - 75;
            windowBeta  = lastScore + 75;
        }

        while (true) {
            bestLineCount = 0;
            int currentAlpha = windowAlpha;

            for (int i = 0; i < rootCount; ++i) {
                pickMove(rootMoves, rootCount, i);
                const Move& rootMove = rootMoves[i];

                Undo undo;
                pushHash(pos.zobrist);
                makeMove(pos, rootMove, undo, *info.rules);

                int score;
                if (i == 0 || rootMultiPV > 1) {
                    int beta = (rootMultiPV <= 1) ? windowBeta : INF;
                    score = -search(pos, depth - 1, -beta, -currentAlpha, 1, info);
                } else {
                    score = -search(pos, depth - 1, -currentAlpha - 1, -currentAlpha, 1, info);
                    if (!info.stop && score > currentAlpha && score < windowBeta) {
                        score = -search(pos, depth - 1, -windowBeta, -currentAlpha, 1, info);
                    }
                }

                unmakeMove(pos, rootMove, undo);
                popHash();

                if (score > currentAlpha) currentAlpha = score;
                rootMoves[i].score = static_cast<int16_t>(std::max(-32768, std::min(32767, score)));

                if (info.stop) break;

                RootLine line;
                line.move = rootMove;
                line.score = score;
                line.pvJson = buildPvJsonFromRootMove(pos, *info.rules, rootMove, depth);
                insertRootLine(bestLines, bestLineCount, std::min(rootMultiPV, 32), line);
            }

            sortMoves(rootMoves, rootCount);

            if (info.stop) break;

            if (rootMultiPV <= 1 && depth >= 2) {
                int bestScoreIter = bestLines[0].score;
                if (bestScoreIter <= windowAlpha) {
                    windowAlpha = -INF;
                    continue;
                } else if (bestScoreIter >= windowBeta) {
                    windowBeta = INF;
                    continue;
                }
            }
            break;
        }

        if (info.stop && depth > 1) break;
        if (bestLineCount == 0) break;

        lastScore = bestLines[0].score;
        result.score = bestLines[0].score;
        extendIfUnstable(info.tm, result.score);
        result.depth = depth;
        result.nodes = info.nodes;
        result.bestMove = bestLines[0].move;

        for (int pvIndex = 0; pvIndex < bestLineCount; ++pvIndex) {
            std::cout << "{\"type\":\"info\",\"depth\":" << depth
                      << ",\"score\":" << bestLines[pvIndex].score
                      << ",\"nodes\":" << info.nodes
                      << ",\"pv\":" << bestLines[pvIndex].pvJson
                      << ",\"pvIndex\":" << pvIndex
                      << "}\n";
            std::cout.flush();
        }

        if (timeUp(info.tm)) break;
    }

    popHash();

    return result;
}
