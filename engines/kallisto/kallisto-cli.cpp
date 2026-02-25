// kallisto-cli.cpp
// CLI shim for Kallisto_4.dll — cloned from sidra-cli.cpp pattern.
// Protocol: Single JSON object on stdin → single JSON object on stdout.
//
// Input JSON:
//   { "currentPlayer": "WHITE"|"BLACK",
//     "timeLimitMs": 5000,
//     "pieces": [ { "type":"MAN"|"KING", "color":"WHITE"|"BLACK", "position":1..32 }, ... ] }
//
// Output JSON:
//   { "from": <int>, "to": <int>, "capturedSquares": [...], "isPromotion": <bool> }
//
// DLL resolution order:
//   1. KALLISTO_DLL_PATH env var
//   2. Kallisto_4.dll   (same dir as exe)
//   3. kallisto_4.dll   (lowercase fallback)

#include <cctype>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

#ifdef _WIN32
#include <windows.h>
#else
#define MAX_PATH 260
#endif

#ifndef API_CALL
#ifdef _WIN32
#define API_CALL __stdcall
#else
#define API_CALL
#endif
#endif

// ──────────────────────────────────────────────
// DLL function pointer types (CheckerBoard API)
// ──────────────────────────────────────────────
typedef void (API_CALL *PF_Init)(void *, int);
typedef void (API_CALL *PF_NewGame)();
typedef void (API_CALL *PF_SetupBoard)(char *);
typedef void (API_CALL *PF_SetTimeControl)(int, int);
typedef void (API_CALL *PF_SetTime)(int, int);
typedef char *(API_CALL *PF_Think)();

struct PieceRec {
  char color; // 'w' or 'b'
  char type;  // 'm' or 'k'
};

// ──────────────────────────────────────────────
// Minimal JSON helpers (no external dependency)
// ──────────────────────────────────────────────
static std::string readStdin() {
  std::ostringstream buf;
  buf << std::cin.rdbuf();
  return buf.str();
}

static void skipWS(const std::string &s, size_t &pos) {
  while (pos < s.size() && std::isspace((unsigned char)s[pos])) pos++;
}

static std::string getStr(const std::string &json, const std::string &key) {
  const std::string needle = "\"" + key + "\"";
  size_t pos = json.find(needle);
  if (pos == std::string::npos) return "";
  pos = json.find(':', pos);
  if (pos == std::string::npos) return "";
  pos++;
  skipWS(json, pos);
  if (pos >= json.size() || json[pos] != '"') return "";
  pos++;
  size_t end = json.find('"', pos);
  if (end == std::string::npos) return "";
  return json.substr(pos, end - pos);
}

static int getInt(const std::string &json, const std::string &key, int fallback) {
  const std::string needle = "\"" + key + "\"";
  size_t pos = json.find(needle);
  if (pos == std::string::npos) return fallback;
  pos = json.find(':', pos);
  if (pos == std::string::npos) return fallback;
  pos++;
  skipWS(json, pos);
  size_t end = pos;
  while (end < json.size() &&
         (std::isdigit((unsigned char)json[end]) || json[end] == '-'))
    end++;
  if (end == pos) return fallback;
  return std::atoi(json.substr(pos, end - pos).c_str());
}

// ──────────────────────────────────────────────
// Board coordinate helpers
// ──────────────────────────────────────────────
static int posFromRowCol(int row, int col) {
  return row * 4 + (col / 2) + 1;
}

static void rowColFromPos(int pos, int &row, int &col) {
  row = (pos - 1) / 4;
  col = ((pos - 1) % 4) * 2 + ((row + 1) % 2);
}

static int posFromSquare(const std::string &sq) {
  if (sq.size() != 2) return -1;
  char file = (char)std::tolower((unsigned char)sq[0]);
  char rank = sq[1];
  if (file < 'a' || file > 'h' || rank < '1' || rank > '8') return -1;
  int col = file - 'a';
  int row = '8' - rank;
  if ((row + col) % 2 == 0) return -1;
  return posFromRowCol(row, col);
}

static std::vector<std::string> splitMove(const std::string &move) {
  std::vector<std::string> parts;
  for (size_t i = 0; i + 1 < move.size(); i++) {
    if (std::isalpha((unsigned char)move[i]) &&
        std::isdigit((unsigned char)move[i + 1])) {
      parts.push_back(move.substr(i, 2));
      i += 1;
    }
  }
  return parts;
}

static void collectCaptured(int fromPos, int toPos,
                            std::unordered_map<int, PieceRec> &board,
                            std::vector<int> &captured, char movingColor) {
  int fr, fc, tr, tc;
  rowColFromPos(fromPos, fr, fc);
  rowColFromPos(toPos, tr, tc);
  int rs = (tr > fr) ? 1 : -1;
  int cs = (tc > fc) ? 1 : -1;
  int r = fr + rs, c = fc + cs;
  while (r != tr && c != tc) {
    int pos = posFromRowCol(r, c);
    auto it = board.find(pos);
    if (it != board.end() && it->second.color != movingColor) {
      captured.push_back(pos);
      board.erase(it);
    }
    r += rs;
    c += cs;
  }
}

static std::string buildSetupString(const std::unordered_map<int, PieceRec> &board,
                                    char side) {
  std::string pos(32, '.');
  for (const auto &e : board) {
    int idx = e.first - 1;
    if (idx < 0 || idx >= 32) continue;
    char c = '.';
    if (e.second.color == 'w') c = (e.second.type == 'k') ? 'W' : 'w';
    else                        c = (e.second.type == 'k') ? 'B' : 'b';
    pos[idx] = c;
  }
  pos.push_back(side);
  pos.push_back('\0');
  return pos;
}

// ──────────────────────────────────────────────
// DLL path resolution
// ──────────────────────────────────────────────
static std::string resolveDllPath() {
  char buf[MAX_PATH];
  DWORD len = GetModuleFileNameA(NULL, buf, MAX_PATH);
  std::string exePath(buf, len);
  size_t slash = exePath.find_last_of("\\/");
  std::string dir = (slash == std::string::npos) ? "." : exePath.substr(0, slash);

  // 1. Env override
  const char *env = std::getenv("KALLISTO_DLL_PATH");
  if (env && env[0]) return std::string(env);

  // 2. Same dir as exe — capitalized
  std::string dll1 = dir + "\\Kallisto_4.dll";
  { std::ifstream f(dll1.c_str()); if (f.good()) return dll1; }

  // 3. Lowercase fallback
  return dir + "\\kallisto_4.dll";
}

// ──────────────────────────────────────────────
// main
// ──────────────────────────────────────────────
int main() {
  const std::string input = readStdin();
  if (input.empty()) {
    std::cerr << "kallisto-cli: Missing input\n";
    return 1;
  }

  const std::string player      = getStr(input, "currentPlayer");
  const int         timeLimitMs = getInt(input, "timeLimitMs", 5000);

  // ── Parse pieces ──────────────────────────────
  std::unordered_map<int, PieceRec> board;
  size_t piecesPos = input.find("\"pieces\"");
  if (piecesPos != std::string::npos) {
    size_t arrStart = input.find('[', piecesPos);
    size_t arrEnd   = input.find(']', arrStart);
    if (arrStart != std::string::npos && arrEnd != std::string::npos) {
      size_t pos = arrStart;
      while (pos < arrEnd) {
        size_t os = input.find('{', pos);
        if (os == std::string::npos || os > arrEnd) break;
        size_t oe = input.find('}', os);
        if (oe == std::string::npos || oe > arrEnd) break;
        std::string obj = input.substr(os, oe - os + 1);
        std::string type  = getStr(obj, "type");
        std::string color = getStr(obj, "color");
        int         position = getInt(obj, "position", -1);
        if (position >= 1 && position <= 32) {
          PieceRec rec;
          rec.color = (color == "WHITE") ? 'w' : 'b';
          rec.type  = (type  == "KING")  ? 'k' : 'm';
          board[position] = rec;
        }
        pos = oe + 1;
      }
    }
  }

  char sideToMove = (player == "BLACK") ? 'b' : 'w';
  const std::string setup = buildSetupString(board, sideToMove);

  // ── Load Kallisto_4.dll ─────────────────────
  const std::string dllPath = resolveDllPath();
  HMODULE dll = LoadLibraryA(dllPath.c_str());
  if (!dll) {
    std::cerr << "kallisto-cli: Failed to load DLL: " << dllPath << "\n";
    return 1;
  }

  PF_Init            EI_Init   = (PF_Init)           GetProcAddress(dll, "EI_Initialization");
  PF_NewGame         EI_New    = (PF_NewGame)         GetProcAddress(dll, "EI_NewGame");
  PF_SetupBoard      EI_Board  = (PF_SetupBoard)      GetProcAddress(dll, "EI_SetupBoard");
  PF_SetTimeControl  EI_TC     = (PF_SetTimeControl)  GetProcAddress(dll, "EI_SetTimeControl");
  PF_SetTime         EI_Time   = (PF_SetTime)         GetProcAddress(dll, "EI_SetTime");
  PF_Think           EI_Think  = (PF_Think)           GetProcAddress(dll, "EI_Think");

  if (!EI_Init || !EI_New || !EI_Board || !EI_TC || !EI_Time || !EI_Think) {
    std::cerr << "kallisto-cli: Missing required DLL exports\n";
    FreeLibrary(dll);
    return 1;
  }

  // ── Run engine ─────────────────────────────
  EI_Init(nullptr, 64);
  EI_New();
  EI_Board(const_cast<char *>(setup.data()));
  EI_TC(0, 0);
  EI_Time(timeLimitMs, timeLimitMs);

  // Redirect engine's stdout noise to NUL during search
  std::streambuf *origCout = std::cout.rdbuf();
  std::ofstream nullStream("NUL");
  std::cout.rdbuf(nullStream.rdbuf());

  const char *moveStr = EI_Think();

  std::cout.rdbuf(origCout);

  // ── Parse engine output ─────────────────────
  auto emitEmpty = [&]() {
    std::cout << "{\"from\":-1,\"to\":-1,\"capturedSquares\":[],\"isPromotion\":false}";
    FreeLibrary(dll);
  };

  if (!moveStr || moveStr[0] == '\0') {
    emitEmpty();
    return 0;
  }

  std::string move(moveStr);
  std::vector<std::string> segs = splitMove(move);
  if (segs.size() < 2) { emitEmpty(); return 0; }

  int fromPos = posFromSquare(segs.front());
  int toPos   = posFromSquare(segs.back());
  if (fromPos < 1 || toPos < 1) { emitEmpty(); return 0; }

  std::vector<int> capturedSquares;
  auto movingIt   = board.find(fromPos);
  char movingColor = (movingIt != board.end()) ? movingIt->second.color : sideToMove;
  char movingType  = (movingIt != board.end()) ? movingIt->second.type  : 'm';

  int cur = fromPos;
  for (size_t i = 1; i < segs.size(); i++) {
    int nxt = posFromSquare(segs[i]);
    if (nxt < 1) continue;
    collectCaptured(cur, nxt, board, capturedSquares, movingColor);
    cur = nxt;
  }

  int destRow, destCol;
  rowColFromPos(toPos, destRow, destCol);
  bool isPromotion = false;
  if (movingType == 'm') {
    if (movingColor == 'w' && destRow == 0) isPromotion = true;
    if (movingColor == 'b' && destRow == 7) isPromotion = true;
  }

  // ── Emit JSON ───────────────────────────────
  std::ostringstream out;
  out << "{\"from\":" << fromPos << ",\"to\":" << toPos
      << ",\"capturedSquares\":[";
  for (size_t i = 0; i < capturedSquares.size(); i++) {
    if (i > 0) out << ",";
    out << capturedSquares[i];
  }
  out << "],\"isPromotion\":" << (isPromotion ? "true" : "false") << "}";
  std::cout << out.str();

  FreeLibrary(dll);
  return 0;
}
