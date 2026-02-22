/**
 * kallisto-sidecar.cpp
 *
 * Thin C++ wrapper that loads Kallisto_4.dll via the EI (Engine Interface)
 * protocol and exposes a simple stdin → stdout JSON protocol identical to
 * sidra-cli.cpp so that KallistoEngineService can spawn it the same way.
 *
 * Input  (stdin, one JSON blob):
 *   { "pieces": [...], "currentPlayer": "WHITE", "timeLimitMs": 2000 }
 *   pieces element: { "type": "MAN"|"KING", "color": "WHITE"|"BLACK",
 *                     "position": 1-32 }
 *   Positions are in EI/SiDra coordinates (bottom-left = 1, 33-CAKE).
 *
 * Output (stdout, one JSON blob):
 *   { "from": N, "to": N, "capturedSquares": [...], "isPromotion": bool }
 *
 * Compile (MSVC Developer Command Prompt, 32-bit required):
 *   cl /EHsc /O2 /arch:IA32 kallisto-sidecar.cpp /link /OUT:kallisto-sidecar.exe
 *
 * The DLL must be in the same directory as the exe, or set KALLISTO_DLL_PATH.
 * Place Kallisto.bk (opening book) at ..\Engines\Kallisto.bk relative to DLL.
 *
 * Coordinate note: Kallisto_4.dll uses standard EI coordinates (rank 8 = sq 1,
 * rank 1 = sq 32), identical to SiDra coordinates. Both need the 33-pos CAKE
 * transform applied before this sidecar is called.
 */

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
// Wine / Linux stub
#define MAX_PATH 260
typedef void *HMODULE;
typedef void *FARPROC;
#define LoadLibraryA(x) nullptr
#define GetProcAddress(m, x) nullptr
#define FreeLibrary(m)
#define Sleep(ms) usleep((ms) * 1000)
#include <unistd.h>
#endif

// ──────────────────────────────────────────────────────────────────────────────
// EI function pointer types for Kallisto_4.dll
// ──────────────────────────────────────────────────────────────────────────────

// Callback type delivered to EI_Think — engine calls this when search is done.
typedef void(__cdecl *FN_MoveCallback)(const char *move);

typedef void(__cdecl *FN_EI_Init)(HWND, int);
typedef void(__cdecl *FN_EI_NewGame)(void);
typedef void(__cdecl *FN_EI_SetupBoard)(char *);
typedef void(__cdecl *FN_EI_SetTime)(int);
typedef void(__cdecl *FN_EI_SetTimeControl)(int, int);
// Kallisto v4: EI_Think takes a callback pointer (asynchronous)
typedef void(__cdecl *FN_EI_Think)(void *callback);
typedef void(__cdecl *FN_EI_Stop)(void);
// Kallisto v4 extras
typedef const char *(__cdecl *FN_getmove)(void);
typedef const char *(__cdecl *FN_enginecommand)(const char *);

// ──────────────────────────────────────────────────────────────────────────────
// Global state for the async callback
// ──────────────────────────────────────────────────────────────────────────────
static volatile int g_moveReady = 0;
static char g_bestMove[128] = {0};

void __cdecl moveCallback(const char *move) {
  if (move && move[0]) {
    strncpy(g_bestMove, move, 127);
    g_bestMove[127] = '\0';
  }
  g_moveReady = 1;
}

// ──────────────────────────────────────────────────────────────────────────────
// Minimal JSON helpers (same as sidra-cli.cpp)
// ──────────────────────────────────────────────────────────────────────────────

static void skipWhitespace(const std::string &s, size_t &pos) {
  while (pos < s.size() && std::isspace((unsigned char)s[pos]))
    pos++;
}

static std::string getStringField(const std::string &json,
                                  const std::string &key) {
  const std::string needle = "\"" + key + "\"";
  size_t pos = json.find(needle);
  if (pos == std::string::npos)
    return "";
  pos = json.find(':', pos);
  if (pos == std::string::npos)
    return "";
  pos++;
  skipWhitespace(json, pos);
  if (pos >= json.size() || json[pos] != '"')
    return "";
  pos++;
  size_t end = json.find('"', pos);
  if (end == std::string::npos)
    return "";
  return json.substr(pos, end - pos);
}

static int getIntField(const std::string &json, const std::string &key,
                       int fallback) {
  const std::string needle = "\"" + key + "\"";
  size_t pos = json.find(needle);
  if (pos == std::string::npos)
    return fallback;
  pos = json.find(':', pos);
  if (pos == std::string::npos)
    return fallback;
  pos++;
  skipWhitespace(json, pos);
  size_t end = pos;
  while (end < json.size() &&
         (std::isdigit((unsigned char)json[end]) || json[end] == '-'))
    end++;
  if (end == pos)
    return fallback;
  return std::atoi(json.substr(pos, end - pos).c_str());
}

// ──────────────────────────────────────────────────────────────────────────────
// Board / position helpers (identical to sidra-cli.cpp)
// ──────────────────────────────────────────────────────────────────────────────

struct PieceRec {
  char color; // 'w' or 'b'
  char type;  // 'm' or 'k'
};

static int positionFromRowCol(int row, int col) {
  return row * 4 + (col / 2) + 1;
}

static void rowColFromPosition(int pos, int &row, int &col) {
  row = (pos - 1) / 4;
  col = ((pos - 1) % 4) * 2 + ((row + 1) % 2);
}

static int positionFromSquare(const std::string &sq) {
  if (sq.size() != 2)
    return -1;
  char file = (char)std::tolower((unsigned char)sq[0]);
  char rank = sq[1];
  if (file < 'a' || file > 'h' || rank < '1' || rank > '8')
    return -1;
  int col = file - 'a';
  int row = '8' - rank; // Rank 8 = Row 0
  if ((row + col) % 2 == 0)
    return -1;
  return positionFromRowCol(row, col);
}

static std::vector<std::string> splitMove(const std::string &move) {
  std::vector<std::string> parts;
  for (size_t i = 0; i + 1 < move.size(); i++) {
    char a = move[i];
    char b = move[i + 1];
    if (std::isalpha((unsigned char)a) && std::isdigit((unsigned char)b)) {
      parts.push_back(move.substr(i, 2));
      i += 1;
    }
  }
  return parts;
}

static void collectCaptured(int fromPos, int toPos,
                            std::unordered_map<int, PieceRec> &board,
                            std::vector<int> &captured, char movingColor) {
  int fromRow, fromCol, toRow, toCol;
  rowColFromPosition(fromPos, fromRow, fromCol);
  rowColFromPosition(toPos, toRow, toCol);
  int rowStep = (toRow > fromRow) ? 1 : -1;
  int colStep = (toCol > fromCol) ? 1 : -1;

  int r = fromRow + rowStep;
  int c = fromCol + colStep;
  while (r != toRow && c != toCol) {
    int pos = positionFromRowCol(r, c);
    auto it = board.find(pos);
    if (it != board.end() && it->second.color != movingColor) {
      captured.push_back(pos);
      board.erase(it);
    }
    r += rowStep;
    c += colStep;
  }
}

static std::string
buildSetupString(const std::unordered_map<int, PieceRec> &board,
                 char sideToMove) {
  std::string pos(32, '.');
  for (const auto &entry : board) {
    int idx = entry.first - 1;
    if (idx < 0 || idx >= 32)
      continue;
    char c = '.';
    if (entry.second.color == 'w')
      c = entry.second.type == 'k' ? 'W' : 'w';
    else
      c = entry.second.type == 'k' ? 'B' : 'b';
    pos[idx] = c;
  }
  pos.push_back(sideToMove);
  return pos;
}

// ──────────────────────────────────────────────────────────────────────────────
// DLL path resolution
// ──────────────────────────────────────────────────────────────────────────────

static std::string resolveDllPath() {
  const char *env = std::getenv("KALLISTO_DLL_PATH");
  if (env && env[0])
    return std::string(env);

#ifdef _WIN32
  char pathBuffer[MAX_PATH];
  DWORD len = GetModuleFileNameA(NULL, pathBuffer, MAX_PATH);
  std::string exeDir(pathBuffer, len);
  size_t slash = exeDir.find_last_of("\\/");
  std::string dir =
      (slash == std::string::npos) ? "." : exeDir.substr(0, slash);

  // Primary: same directory as exe
  std::string primary = dir + "\\Kallisto_4.dll";
  {
    std::ifstream f(primary.c_str());
    if (f.good())
      return primary;
  }

  // Fallback: lowercase variant
  std::string lower = dir + "\\kallisto_4.dll";
  {
    std::ifstream f(lower.c_str());
    if (f.good())
      return lower;
  }
#endif

  return "Kallisto_4.dll"; // last resort: OS search path
}

// ──────────────────────────────────────────────────────────────────────────────
// main
// ──────────────────────────────────────────────────────────────────────────────

int main() {
  // Read entire stdin as one blob
  std::ostringstream buf;
  buf << std::cin.rdbuf();
  const std::string input = buf.str();

  if (input.empty()) {
    std::cerr << "[kallisto] Missing input\n";
    return 1;
  }

  // Parse fields
  const std::string player = getStringField(input, "currentPlayer");
  const int timeLimitMs = getIntField(input, "timeLimitMs", 2000);

  // Parse pieces
  std::unordered_map<int, PieceRec> board;
  size_t piecesPos = input.find("\"pieces\"");
  if (piecesPos != std::string::npos) {
    size_t arrayStart = input.find('[', piecesPos);
    size_t arrayEnd = input.find(']', arrayStart);
    if (arrayStart != std::string::npos && arrayEnd != std::string::npos) {
      size_t pos = arrayStart;
      while (pos < arrayEnd) {
        size_t objStart = input.find('{', pos);
        if (objStart == std::string::npos || objStart > arrayEnd)
          break;
        size_t objEnd = input.find('}', objStart);
        if (objEnd == std::string::npos || objEnd > arrayEnd)
          break;
        std::string obj = input.substr(objStart, objEnd - objStart + 1);

        std::string type = getStringField(obj, "type");
        std::string color = getStringField(obj, "color");
        int position = getIntField(obj, "position", -1);

        if (position >= 1 && position <= 32) {
          PieceRec rec;
          rec.color = (color == "WHITE") ? 'w' : 'b';
          rec.type = (type == "KING") ? 'k' : 'm';
          board[position] = rec;
        }
        pos = objEnd + 1;
      }
    }
  }

  char sideToMove = (player == "BLACK") ? 'b' : 'w';
  const std::string setup = buildSetupString(board, sideToMove);

  // Load DLL
  const std::string dllPath = resolveDllPath();
#ifdef _WIN32
  HMODULE dll = LoadLibraryA(dllPath.c_str());
  if (!dll) {
    std::cerr << "[kallisto] Failed to load DLL: " << dllPath << "\n";
    std::cout << "{\"from\":-1,\"to\":-1,\"capturedSquares\":[],\"isPromotion\":false}";
    return 1;
  }

  FN_EI_Init p_Init = (FN_EI_Init)GetProcAddress(dll, "EI_Initialization");
  FN_EI_NewGame p_NewGame = (FN_EI_NewGame)GetProcAddress(dll, "EI_NewGame");
  FN_EI_SetupBoard p_SetupBoard =
      (FN_EI_SetupBoard)GetProcAddress(dll, "EI_SetupBoard");
  FN_EI_SetTime p_SetTime = (FN_EI_SetTime)GetProcAddress(dll, "EI_SetTime");
  FN_EI_SetTimeControl p_SetTimeControl =
      (FN_EI_SetTimeControl)GetProcAddress(dll, "EI_SetTimeControl");
  FN_EI_Think p_Think = (FN_EI_Think)GetProcAddress(dll, "EI_Think");
  FN_EI_Stop p_Stop = (FN_EI_Stop)GetProcAddress(dll, "EI_Stop");
  FN_getmove p_getmove = (FN_getmove)GetProcAddress(dll, "getmove");

  if (!p_Init || !p_NewGame || !p_SetupBoard || !p_SetTime || !p_Think) {
    std::cerr << "[kallisto] Missing required exports in " << dllPath << "\n";
    FreeLibrary(dll);
    std::cout << "{\"from\":-1,\"to\":-1,\"capturedSquares\":[],\"isPromotion\":false}";
    return 1;
  }

  // Initialise engine
  p_Init(NULL, 64);
  p_NewGame();
  p_SetupBoard(const_cast<char *>(setup.data()));
  if (p_SetTimeControl)
    p_SetTimeControl(0, 0);
  p_SetTime(timeLimitMs);

  // Silence engine's stdout chatter during search
  std::streambuf *savedCout = std::cout.rdbuf();
  std::ofstream nullStream("NUL");
  std::cout.rdbuf(nullStream.rdbuf());

  // Start async search
  g_moveReady = 0;
  g_bestMove[0] = '\0';
  p_Think((void *)moveCallback);

  // Wait for callback — up to timeLimitMs + 3 s safety margin
  const int maxWaitMs = timeLimitMs + 3000;
  for (int waited = 0; waited < maxWaitMs && !g_moveReady; waited += 5) {
    Sleep(5);
  }

  // Restore cout
  std::cout.rdbuf(savedCout);

  // If callback never fired, try EI_Stop + getmove
  if (!g_moveReady) {
    if (p_Stop)
      p_Stop();
    Sleep(200);
    if (p_getmove) {
      const char *gm = p_getmove();
      if (gm && gm[0]) {
        strncpy(g_bestMove, gm, 127);
        g_bestMove[127] = '\0';
        g_moveReady = 1;
      }
    }
  }

  FreeLibrary(dll);
#else
  std::cerr << "[kallisto] Windows DLL required\n";
  g_moveReady = 0;
#endif

  if (!g_moveReady || g_bestMove[0] == '\0') {
    std::cout
        << "{\"from\":-1,\"to\":-1,\"capturedSquares\":[],\"isPromotion\":false}";
    return 0;
  }

  // Parse algebraic move string → 1-32 positions
  std::string move(g_bestMove);
  std::vector<std::string> segments = splitMove(move);

  if (segments.size() < 2) {
    std::cout
        << "{\"from\":-1,\"to\":-1,\"capturedSquares\":[],\"isPromotion\":false}";
    return 0;
  }

  int fromPos = positionFromSquare(segments.front());
  int toPos = positionFromSquare(segments.back());

  if (fromPos < 1 || toPos < 1) {
    std::cout
        << "{\"from\":-1,\"to\":-1,\"capturedSquares\":[],\"isPromotion\":false}";
    return 0;
  }

  // Infer captured squares by walking the path
  std::vector<int> capturedSquares;
  auto movingIt = board.find(fromPos);
  char movingColor =
      (movingIt != board.end()) ? movingIt->second.color : sideToMove;
  char movingType = (movingIt != board.end()) ? movingIt->second.type : 'm';

  int current = fromPos;
  for (size_t i = 1; i < segments.size(); i++) {
    int next = positionFromSquare(segments[i]);
    if (next < 1)
      continue;
    collectCaptured(current, next, board, capturedSquares, movingColor);
    current = next;
  }

  // Promotion detection (EI coordinates: white promotes at row 0, black at row 7)
  int destRow, destCol;
  rowColFromPosition(toPos, destRow, destCol);
  bool isPromotion = false;
  if (movingType == 'm') {
    if (movingColor == 'w' && destRow == 0)
      isPromotion = true;
    if (movingColor == 'b' && destRow == 7)
      isPromotion = true;
  }

  // Emit JSON result
  std::ostringstream out;
  out << "{\"from\":" << fromPos << ",\"to\":" << toPos
      << ",\"capturedSquares\":[";
  for (size_t i = 0; i < capturedSquares.size(); i++) {
    if (i > 0)
      out << ",";
    out << capturedSquares[i];
  }
  out << "],\"isPromotion\":" << (isPromotion ? "true" : "false") << "}";
  std::cout << out.str();

  return 0;
}
