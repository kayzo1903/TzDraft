#include "protocol/ipc.h"
#include "protocol/messages.h"
#include "core/types.h"
#include "core/square_map.h"
#include "rules/variant.h"
#include "board/position.h"
#include "board/hash.h"
#include "search/search.h"
#include "eval/eval.h"

#include <iostream>
#include <string>
#include <cstring>
#include <cctype>
#include <cstdio>

// ============================================================
// Minimal hand-rolled JSON parser
// ============================================================

static std::string trim(const std::string& s) {
    size_t a = s.find_first_not_of(" \t\r\n");
    size_t b = s.find_last_not_of(" \t\r\n");
    if (a == std::string::npos) return "";
    return s.substr(a, b - a + 1);
}

// Extract a string value for a key in a flat JSON object.
// Returns "" if not found.
static std::string jsonGetString(const std::string& json, const std::string& key) {
    std::string search = "\"" + key + "\"";
    size_t pos = json.find(search);
    if (pos == std::string::npos) return "";
    pos = json.find(':', pos + search.size());
    if (pos == std::string::npos) return "";
    pos = json.find_first_not_of(" \t", pos + 1);
    if (pos == std::string::npos) return "";
    if (json[pos] == '"') {
        // String value
        size_t end = json.find('"', pos + 1);
        if (end == std::string::npos) return "";
        return json.substr(pos + 1, end - pos - 1);
    }
    return "";
}

// Extract an integer value for a key.
static int jsonGetInt(const std::string& json, const std::string& key, int defaultVal = 0) {
    std::string search = "\"" + key + "\"";
    size_t pos = json.find(search);
    if (pos == std::string::npos) return defaultVal;
    pos = json.find(':', pos + search.size());
    if (pos == std::string::npos) return defaultVal;
    pos = json.find_first_not_of(" \t", pos + 1);
    if (pos == std::string::npos) return defaultVal;
    // Parse integer (possibly negative)
    int sign = 1;
    size_t start = pos;
    if (json[pos] == '-') { sign = -1; pos++; }
    if (pos >= json.size() || !isdigit((unsigned char)json[pos])) return defaultVal;
    int val = 0;
    while (pos < json.size() && isdigit((unsigned char)json[pos])) {
        val = val * 10 + (json[pos] - '0');
        pos++;
    }
    return sign * val;
}

// ============================================================
// FEN parser
// FEN format: W:W21,22,23,24:B9,10,11,12
// W/B at start = side to move
// W... = white pieces (K prefix for kings)
// B... = black pieces
// PDN 1-based → internal 0-based (subtract 1)
// ============================================================

static Position parseFen(const std::string& fen) {
    Position pos;
    pos.whiteMen = pos.whiteKings = pos.blackMen = pos.blackKings = 0;
    pos.sideToMove = 0;
    pos.ply = 0;
    pos.fiftyMove = 0;
    pos.zobrist = 0;

    if (fen.empty()) {
        initPosition(pos);
        pos.zobrist = computeHash(pos);
        return pos;
    }

    const char* p = fen.c_str();

    // Side to move
    if (*p == 'W' || *p == 'w') { pos.sideToMove = 0; p++; }
    else if (*p == 'B' || *p == 'b') { pos.sideToMove = 1; p++; }

    // Consume ':'
    while (*p && *p != ':') p++;

    // Parse color sections
    while (*p == ':') {
        p++;  // skip ':'
        int pieceColor = -1;  // 0=white, 1=black
        if (*p == 'W' || *p == 'w') { pieceColor = 0; p++; }
        else if (*p == 'B' || *p == 'b') { pieceColor = 1; p++; }
        else continue;

        // Parse comma-separated square numbers
        while (*p && *p != ':') {
            bool isKing = false;
            if (*p == 'K' || *p == 'k') { isKing = true; p++; }

            // Read integer
            if (!isdigit((unsigned char)*p)) { p++; continue; }
            int sq = 0;
            while (*p && isdigit((unsigned char)*p)) {
                sq = sq * 10 + (*p - '0');
                p++;
            }
            sq--;  // PDN 1-based to 0-based

            if (sq >= 0 && sq < 32) {
                Bitboard mask = (1U << sq);
                if (pieceColor == 0) {
                    if (isKing) pos.whiteKings |= mask;
                    else        pos.whiteMen   |= mask;
                } else {
                    if (isKing) pos.blackKings |= mask;
                    else        pos.blackMen   |= mask;
                }
            }

            if (*p == ',') p++;
        }
    }

    pos.zobrist = computeHash(pos);
    return pos;
}

// ============================================================
// Move notation: "XXYY" or multi-jump "XX-YY-ZZ"
// We use a simple format: from (2 digits) + 'x' + cap1 + ... + to (2 digits)
// For display we just output from and to as 2-digit PDN squares (1-based)
// ============================================================

static std::string moveToStr(const Move& m) {
    if (m.from == 0xFF) return "0000";
    // PDN: 1-based
    std::string s;
    int from = (int)m.from + 1;
    int to   = (int)m.to   + 1;
    char buf[32];
    snprintf(buf, sizeof(buf), "%02d%02d", from, to);
    return std::string(buf);
}

// ============================================================
// Message parser
// ============================================================

static IncomingMsg parseMessage(const std::string& line) {
    IncomingMsg msg;
    msg.type = MsgType::Unknown;
    msg.go.depth  = 20;
    msg.go.timeMs = 0;
    msg.go.multiPV = 1;

    std::string type = jsonGetString(line, "type");
    if (type == "setVariant") {
        msg.type    = MsgType::SetVariant;
        msg.variant = jsonGetString(line, "variant");
    } else if (type == "setPosition") {
        msg.type = MsgType::SetPosition;
        msg.fen  = jsonGetString(line, "fen");
    } else if (type == "go") {
        msg.type          = MsgType::Go;
        msg.go.depth      = jsonGetInt(line, "depth",   20);
        msg.go.timeMs     = jsonGetInt(line, "timeMs",  0);
        msg.go.multiPV    = jsonGetInt(line, "multiPV", 1);
    } else if (type == "stop") {
        msg.type = MsgType::Stop;
    } else if (type == "evalTrace") {
        msg.type = MsgType::EvalTrace;
        msg.fen  = jsonGetString(line, "fen");
    } else if (type == "quit") {
        msg.type = MsgType::Quit;
    }

    return msg;
}

// ============================================================
// Main IPC loop
// ============================================================

void runIpcLoop() {
    const RuleConfig* rules = &TANZANIA;
    Position pos;
    initPosition(pos);
    pos.zobrist = computeHash(pos);

    std::string line;
    while (std::getline(std::cin, line)) {
        line = trim(line);
        if (line.empty()) continue;

        IncomingMsg msg = parseMessage(line);

        switch (msg.type) {
            case MsgType::SetVariant: {
                if (msg.variant == "tanzania" || msg.variant == "Tanzania") {
                    rules = &TANZANIA;
                } else if (msg.variant == "russian" || msg.variant == "Russian") {
                    rules = &RUSSIAN;
                } else {
                    std::cout << "{\"type\":\"error\",\"message\":\"Unknown variant: "
                              << msg.variant << "\"}\n";
                }
                break;
            }

            case MsgType::SetPosition: {
                pos = parseFen(msg.fen);
                break;
            }

            case MsgType::Go: {
                SearchInfo info;
                info.rules       = rules;
                info.maxDepth    = msg.go.depth;
                info.timeLimitMs = msg.go.timeMs;
                info.stop        = false;
                info.nodes       = 0;

                BestResult res = searchRoot(pos, info, msg.go.multiPV);

                std::string moveStr = moveToStr(res.bestMove);
                std::cout << "{\"type\":\"bestmove\",\"move\":\"" << moveStr
                          << "\",\"score\":" << res.score
                          << ",\"depth\":" << res.depth
                          << ",\"nodes\":" << res.nodes
                          << "}\n";
                std::cout.flush();
                break;
            }

            case MsgType::Stop: {
                // Stop is handled inside search via info.stop flag
                // Here we just acknowledge
                break;
            }

            case MsgType::EvalTrace: {
                Position epos = parseFen(msg.fen);
                EvalTrace t = evalTrace(epos, *rules);
                std::cout << "{\"type\":\"evalTrace\""
                          << ",\"material\":"  << t.material
                          << ",\"mobility\":"  << t.mobility
                          << ",\"structure\":" << t.structure
                          << ",\"patterns\":"  << t.patterns
                          << ",\"kingSafety\":" << t.kingSafety
                          << ",\"tempo\":"     << t.tempo
                          << ",\"total\":"     << t.total
                          << "}\n";
                std::cout.flush();
                break;
            }

            case MsgType::Quit:
                return;

            case MsgType::Unknown:
            default:
                std::cout << "{\"type\":\"error\",\"message\":\"Unknown message\"}\n";
                std::cout.flush();
                break;
        }
    }
}
