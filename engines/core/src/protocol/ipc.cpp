#include "protocol/ipc.h"
#include "protocol/messages.h"
#include "core/types.h"
#include "core/square_map.h"
#include "rules/variant.h"
#include "board/position.h"
#include "board/hash.h"
#include "board/makemove.h"
#include "board/fen.h"
#include "search/search.h"
#include "search/tt.h"
#include "eval/eval.h"
#include "endgame/bitbase.h"
#include "rules/repetition.h"

#include <iostream>
#include <string>
#include <cstring>
#include <cctype>
#include <cstdio>
#include <thread>
#include <atomic>

// ============================================================
// Minimal hand-rolled JSON parser
// ============================================================

static std::string trim(const std::string& s) {
    size_t a = s.find_first_not_of(" \t\r\n");
    size_t b = s.find_last_not_of(" \t\r\n");
    if (a == std::string::npos) return "";
    return s.substr(a, b - a + 1);
}

// Extract a JSON array of strings for a key.
// Handles: "key": ["a","b","c"]
static std::vector<std::string> jsonGetStringArray(const std::string& json, const std::string& key) {
    std::vector<std::string> result;
    std::string search = "\"" + key + "\"";
    size_t pos = json.find(search);
    if (pos == std::string::npos) return result;
    pos = json.find(':', pos + search.size());
    if (pos == std::string::npos) return result;
    pos = json.find_first_not_of(" \t", pos + 1);
    if (pos == std::string::npos || json[pos] != '[') return result;
    pos++;  // skip '['
    while (pos < json.size()) {
        pos = json.find_first_not_of(" \t\r\n,", pos);
        if (pos == std::string::npos) break;
        if (json[pos] == ']') break;
        if (json[pos] == '"') {
            size_t end = json.find('"', pos + 1);
            if (end == std::string::npos) break;
            result.push_back(json.substr(pos + 1, end - pos - 1));
            pos = end + 1;
        } else {
            pos++;
        }
    }
    return result;
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
        msg.type    = MsgType::SetPosition;
        msg.fen     = jsonGetString(line, "fen");
        msg.history = jsonGetStringArray(line, "history");
    } else if (type == "go") {
        msg.type          = MsgType::Go;
        msg.go.depth      = jsonGetInt(line, "depth",   20);
        msg.go.timeMs     = jsonGetInt(line, "timeMs",  0);
        msg.go.multiPV    = jsonGetInt(line, "multiPV", 1);
    } else if (type == "stop") {
        msg.type = MsgType::Stop;
    } else if (type == "probe") {
        msg.type = MsgType::Probe;
        msg.fen  = jsonGetString(line, "fen");
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
    clearHashHistory();
    pushHash(pos.zobrist);

    std::thread searchThread;
    std::atomic<bool> searchRunning{false};

    std::string line;
    while (std::getline(std::cin, line)) {
        line = trim(line);
        if (line.empty()) continue;

        IncomingMsg msg = parseMessage(line);

        switch (msg.type) {
            case MsgType::SetVariant: {
                if (searchRunning.load()) {
                    std::cout << "{\"type\":\"error\",\"message\":\"Search already running\"}\n";
                    std::cout.flush();
                    break;
                }
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
                if (searchRunning.load()) {
                    std::cout << "{\"type\":\"error\",\"message\":\"Search already running\"}\n";
                    std::cout.flush();
                    break;
                }
                pos = parseFen(msg.fen);
                clearHashHistory();
                // Push game history hashes so the search can detect game-level repetitions.
                // The gauntlet sends the FENs of all prior positions in the game.
                for (const auto& histFen : msg.history) {
                    Position hpos = parseFen(histFen);
                    pushHash(hpos.zobrist);
                }
                pushHash(pos.zobrist);
                break;
            }

            case MsgType::Go: {
                if (searchRunning.load()) {
                    std::cout << "{\"type\":\"error\",\"message\":\"Search already running\"}\n";
                    std::cout.flush();
                    break;
                }

                if (searchThread.joinable()) {
                    searchThread.join();
                }

                const RuleConfig* goRules = rules;
                Position goPos = pos;
                int goDepth = msg.go.depth;
                int goTimeMs = msg.go.timeMs;
                int goMultiPV = msg.go.multiPV;

                searchRunning.store(true);
                searchThread = std::thread([goRules, goPos, goDepth, goTimeMs, goMultiPV, &searchRunning]() mutable {
                    SearchInfo info;
                    info.rules       = goRules;
                    info.maxDepth    = goDepth;
                    info.timeLimitMs = goTimeMs;
                    info.stop        = false;
                    info.nodes       = 0;

                    BestResult res = searchRoot(goPos, info, goMultiPV);
                    Position pvPos = goPos;
                    std::string ponder = "0000";
                    if (res.bestMove.from != 0xFF) {
                        Undo undo;
                        makeMove(pvPos, res.bestMove, undo, *goRules);
                        int dummy = 0;
                        Move ponderMove;
                        ponderMove.from = 0xFF;
                        ponderMove.to = 0xFF;
                        probeTT(pvPos.zobrist, 0, -INF, INF, dummy, ponderMove);
                        if (ponderMove.from != 0xFF) {
                            ponder = moveToStr(ponderMove);
                        }
                    }

                    std::string moveStr = moveToStr(res.bestMove);
                    std::cout << "{\"type\":\"bestmove\",\"move\":\"" << moveStr
                              << "\",\"ponder\":\"" << ponder
                              << "\",\"score\":" << res.score
                              << ",\"depth\":" << res.depth
                              << ",\"nodes\":" << res.nodes
                              << ",\"capturedSquares\":[";
                    for (int ci = 0; ci < (int)res.bestMove.capLen; ci++) {
                        if (ci > 0) std::cout << ",";
                        std::cout << ((int)res.bestMove.captures[ci] + 1);
                    }
                    std::cout << "],\"isPromotion\":"
                              << (res.bestMove.promote ? "true" : "false")
                              << "}\n";
                    std::cout.flush();
                    searchRunning.store(false);
                });
                break;
            }

            case MsgType::Stop: {
                if (searchRunning.load()) {
                    requestSearchStop();
                }
                break;
            }

            case MsgType::Probe: {
                Position ppos = parseFen(msg.fen);
                BitbaseResult probe = probeBitbase(ppos);
                const char* wdl = "unknown";
                switch (probe) {
                    case BitbaseResult::WIN:  wdl = "win"; break;
                    case BitbaseResult::DRAW: wdl = "draw"; break;
                    case BitbaseResult::LOSS: wdl = "loss"; break;
                    case BitbaseResult::UNKNOWN:
                    default:                  wdl = "unknown"; break;
                }

                std::cout << "{\"type\":\"probe\",\"wdl\":\"" << wdl
                          << "\",\"dtm\":0,\"bestMove\":\"0000\"}\n";
                std::cout.flush();
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
                if (searchRunning.load()) {
                    requestSearchStop();
                }
                if (searchThread.joinable()) {
                    searchThread.join();
                }
                return;

            case MsgType::Unknown:
            default:
                std::cout << "{\"type\":\"error\",\"message\":\"Unknown message\"}\n";
                std::cout.flush();
                break;
        }
    }

    if (searchRunning.load()) {
        requestSearchStop();
    }
    if (searchThread.joinable()) {
        searchThread.join();
    }
}
