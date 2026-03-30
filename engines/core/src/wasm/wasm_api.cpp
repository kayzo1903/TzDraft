/**
 * wasm_api.cpp — Mkaguzi WASM entry point
 *
 * Exposes stateless C functions for the browser via Emscripten.
 * Each function takes/returns null-terminated strings (FEN, JSON).
 * All square numbers in the public API are PDN 1-based (1–32).
 *
 * Build with Emscripten:
 *   emcmake cmake .. -DCMAKE_BUILD_TYPE=Release
 *   emmake make mkaguzi_wasm
 */

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define MKZ_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define MKZ_EXPORT
#endif

#include "core/types.h"
#include "core/square_map.h"
#include "board/position.h"
#include "board/hash.h"
#include "board/fen.h"
#include "board/makemove.h"
#include "rules/movegen.h"
#include "rules/variant.h"
#include "rules/repetition.h"
#include "search/search.h"
#include "search/tt.h"
#include "eval/eval.h"

#include <cstdio>
#include <bit>
#include <cstring>
#include <string>
#include <vector>

// ─────────────────────────────────────────────────────────────
// Output buffer — all return values point into this static buf
// ─────────────────────────────────────────────────────────────

static char g_out[65536];

static const char* ret(const std::string& s) {
    size_t len = s.size();
    if (len >= sizeof(g_out)) len = sizeof(g_out) - 1;
    memcpy(g_out, s.c_str(), len);
    g_out[len] = '\0';
    return g_out;
}

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

static std::string moveToJson(const Move& m) {
    char buf[256];
    // Captures: build array
    std::string caps = "[";
    for (int i = 0; i < (int)m.capLen; i++) {
        if (i > 0) caps += ",";
        caps += std::to_string((int)m.captures[i] + 1); // 0→1-based PDN
    }
    caps += "]";
    snprintf(buf, sizeof(buf),
        "{\"from\":%d,\"to\":%d,\"captures\":%s,\"promote\":%s}",
        (int)m.from + 1, (int)m.to + 1,
        caps.c_str(),
        m.promote ? "true" : "false"
    );
    return std::string(buf);
}

// Parse a simple JSON integer array like [1,2,3]
static std::vector<int> parseIntArray(const char* json) {
    std::vector<int> result;
    if (!json || *json == '\0') return result;
    const char* p = json;
    while (*p && *p != '[') p++;
    if (!*p) return result;
    p++; // skip '['
    while (*p && *p != ']') {
        while (*p && (*p == ',' || *p == ' ')) p++;
        if (*p == ']' || !*p) break;
        int n = 0;
        bool neg = false;
        if (*p == '-') { neg = true; p++; }
        while (*p >= '0' && *p <= '9') { n = n * 10 + (*p - '0'); p++; }
        result.push_back(neg ? -n : n);
    }
    return result;
}

// Count pieces on the board
static void countPieces(const Position& pos, int& wm, int& wk, int& bm, int& bk) {
    wm = std::popcount(pos.whiteMen);
    wk = std::popcount(pos.whiteKings);
    bm = std::popcount(pos.blackMen);
    bk = std::popcount(pos.blackKings);
}

// ─────────────────────────────────────────────────────────────
// Public C API
// ─────────────────────────────────────────────────────────────

extern "C" {

/**
 * Initialize lookup tables (call once at startup).
 */
MKZ_EXPORT void mkz_init() {
    initSquareMaps();
    initZobrist();
    clearHashHistory();
}

/**
 * Return the standard starting FEN.
 */
MKZ_EXPORT const char* mkz_initial_fen() {
    Position pos;
    initPosition(pos);
    pos.zobrist = computeHash(pos);
    return ret(posToFen(pos));
}

/**
 * Generate all legal moves for a position.
 *
 * @param fen  PDN FEN string
 * @return JSON array: [{"from":N,"to":N,"captures":[...],"promote":bool}, ...]
 */
MKZ_EXPORT const char* mkz_generate_moves(const char* fen) {
    Position pos = parseFen(fen ? fen : "");
    Move moves[256]; // flying kings can generate many more moves than short kings
    int count = 0;
    generateMoves(pos, TANZANIA, moves, count);

    std::string out = "[";
    for (int i = 0; i < count; i++) {
        if (i > 0) out += ",";
        out += moveToJson(moves[i]);
    }
    out += "]";
    return ret(out);
}

/**
 * Apply a move and return the new FEN.
 *
 * from/to are PDN 1-based squares.
 * If the move is not found in legal moves, returns "".
 */
MKZ_EXPORT const char* mkz_apply_move(const char* fen, int from_pdn, int to_pdn) {
    Position pos = parseFen(fen ? fen : "");
    Move moves[256];
    int count = 0;
    generateMoves(pos, TANZANIA, moves, count);

    // Find the matching move (first legal (from,to) pair)
    int from_idx = from_pdn - 1; // PDN 1-based → 0-based internal
    int to_idx   = to_pdn   - 1;

    for (int i = 0; i < count; i++) {
        if ((int)moves[i].from == from_idx && (int)moves[i].to == to_idx) {
            Undo undo;
            makeMove(pos, moves[i], undo, TANZANIA);
            return ret(posToFen(pos));
        }
    }
    return ret(""); // illegal move
}

/**
 * Run a search and return the best move.
 *
 * @param fen          PDN FEN of the current position
 * @param history_json JSON int array of prior position hashes (for repetition)
 *                     Pass "[]" or "" if not needed.
 * @param time_ms      Time budget in milliseconds (0 = use depth only)
 * @param depth        Max search depth (0 = use time only, default 20)
 * @param level        Strength level 15–19 (19 = max)
 * @param randomness   Eval noise in centipawns (0 = deterministic)
 *
 * @return JSON: {"from":N,"to":N,"captures":[...],"promote":bool,"score":N,"depth":N,"nodes":N}
 *         or  {"from":0,"to":0,...} if no legal moves
 */
MKZ_EXPORT const char* mkz_search(
    const char* fen,
    const char* history_json,
    int time_ms,
    int depth,
    int level,
    int randomness
) {
    Position pos = parseFen(fen ? fen : "");

    // Push game history hashes for repetition detection
    clearHashHistory();
    if (history_json && *history_json) {
        // history_json is a JSON array of FEN strings:
        // ["W:W...:B...", "B:W...:B..."]
        // We re-parse each FEN and push its hash.
        // Simple extraction: find each quoted string
        const char* p = history_json;
        while (*p) {
            while (*p && *p != '"') p++;
            if (!*p) break;
            p++; // skip '"'
            const char* start = p;
            while (*p && *p != '"') p++;
            if (!*p) break;
            std::string histFen(start, p - start);
            p++; // skip closing '"'
            if (!histFen.empty()) {
                Position hp = parseFen(histFen);
                pushHash(hp.zobrist);
            }
        }
    }
    pushHash(pos.zobrist);

    SearchInfo info;
    info.rules       = &TANZANIA;
    info.maxDepth    = (depth > 0) ? depth : 20;
    info.timeLimitMs = time_ms;
    info.level       = (level >= 15 && level <= 19) ? level : 19;
    info.randomness  = randomness;
    info.stop        = false;
    info.nodes       = 0;

    BestResult res = searchRoot(pos, info, 1);

    char buf[512];
    std::string caps = "[";
    for (int i = 0; i < (int)res.bestMove.capLen; i++) {
        if (i > 0) caps += ",";
        caps += std::to_string((int)res.bestMove.captures[i] + 1);
    }
    caps += "]";

    if (res.bestMove.from == 0xFF) {
        // No legal moves
        snprintf(buf, sizeof(buf),
            "{\"from\":0,\"to\":0,\"captures\":[],\"promote\":false,\"score\":%d,\"depth\":%d,\"nodes\":%lld}",
            res.score, res.depth, res.nodes
        );
    } else {
        snprintf(buf, sizeof(buf),
            "{\"from\":%d,\"to\":%d,\"captures\":%s,\"promote\":%s,\"score\":%d,\"depth\":%d,\"nodes\":%lld}",
            (int)res.bestMove.from + 1, (int)res.bestMove.to + 1,
            caps.c_str(),
            res.bestMove.promote ? "true" : "false",
            res.score, res.depth, res.nodes
        );
    }
    return ret(std::string(buf));
}

/**
 * Evaluate the game result for a position.
 *
 * @param fen                PDN FEN of the current position
 * @param fifty_moves        Reversible half-move counter (for Art. 8.3)
 * @param three_kings_count  Stronger-side moves elapsed in 3-kings-vs-1 endgame (Art. 8.5)
 * @param endgame_count      Half-moves elapsed in K+Man vs K / 2K vs K (Art. 8.4)
 *
 * @return JSON:
 *   {"status":"ongoing"}
 *   {"status":"win",  "winner":"white"|"black", "reason":"stalemate"}
 *   {"status":"draw", "winner":"none",          "reason":"thirty_move"|"three_kings"|"endgame"|"insufficient_material"|"repetition"}
 */
MKZ_EXPORT const char* mkz_game_result(
    const char* fen,
    int fifty_moves,
    int three_kings_count,
    int endgame_count
) {
    Position pos = parseFen(fen ? fen : "");

    // Check legal moves for current side
    Move moves[256];
    int count = 0;
    generateMoves(pos, TANZANIA, moves, count);

    if (count == 0) {
        // Current side has no moves — they lose
        const char* winner = (pos.sideToMove == 0) ? "black" : "white";
        char buf[128];
        snprintf(buf, sizeof(buf),
            "{\"status\":\"win\",\"winner\":\"%s\",\"reason\":\"stalemate\"}", winner);
        return ret(std::string(buf));
    }

    // Art 8.3 — 30 consecutive moves by both players = 60 half-moves.
    if (fifty_moves >= 60) {
        return ret("{\"status\":\"draw\",\"winner\":\"none\",\"reason\":\"thirty_move\"}");
    }

    // Insufficient material evaluation (K vs K). 
    // Removed according to Art 8.1: K vs K is NOT an automatic draw in-game.
    int wm, wk, bm, bk;
    countPieces(pos, wm, wk, bm, bk);

    // Art 8.5 — three-kings rule: 3K vs 1K, 12 stronger-side moves without progress.
    bool whiteThreeKings = (wk >= 3 && bm == 0 && bk == 1 && wm == 0);
    bool blackThreeKings = (bk >= 3 && wm == 0 && wk == 1 && bm == 0);
    if ((whiteThreeKings || blackThreeKings) && three_kings_count >= 12) {
        return ret("{\"status\":\"draw\",\"winner\":\"none\",\"reason\":\"three_kings\"}");
    }

    // Art 8.4 — K+Man vs K or 2K vs K: draw after 5 full moves by the weak side.
    bool whiteEndgame = (wm + wk == 2 && bm == 0 && bk == 1);
    bool blackEndgame = (bm + bk == 2 && wm == 0 && wk == 1);
    if ((whiteEndgame || blackEndgame) && endgame_count >= 5) {
        return ret("{\"status\":\"draw\",\"winner\":\"none\",\"reason\":\"endgame\"}");
    }

    return ret("{\"status\":\"ongoing\"}");
}

/**
 * Serialize a position to PDN FEN (utility).
 */
MKZ_EXPORT const char* mkz_pos_to_fen(const char* fen) {
    Position pos = parseFen(fen ? fen : "");
    return ret(posToFen(pos));
}

} // extern "C"
