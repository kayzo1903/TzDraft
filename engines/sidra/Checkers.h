#ifndef Checkers_H
#define Checkers_H

#include "EdAccess.h"
#include <stdint.h>

// -------------------------   defines

#define WHITE	1
#define BLACK	2
#define KING	4
#define OFF     0xf0
#define CHANGE_COLOR 3

#define WHITE_MAN  (WHITE)
#define WHITE_KING (WHITE | KING)
#define BLACK_MAN  (BLACK)
#define BLACK_KING (BLACK | KING)

#define OP_CHECKER(x) (Board[x] & (stm ^ CHANGE_COLOR))

#define MOVE_BUFFER_LEN 409600
#define WIN 32767
#define ED_WIN 30000
#define MAX_DEPTH 128

#define MAN_VALUE 100
#define KING_VALUE 300
#define MOBILITY_BONUS 2  // centipawns per diagonal square a king can slide

// Transposition table — allows the engine to reuse scores across iterations
// and avoid re-searching positions reached by different move orders.
#define TT_EXACT       0   // score is exact
#define TT_LOWERBOUND  1   // score is a lower bound (failed high — beta cutoff)
#define TT_UPPERBOUND  2   // score is an upper bound (failed low — no improvement)
#define TT_SIZE_LOG2   20
#define TT_SIZE        (1 << TT_SIZE_LOG2)  // 1M entries = 16 MB
#define TT_MASK        (TT_SIZE - 1)

// -------------------------   structures

struct Move {
	unsigned from;
	unsigned to;
	bool promotion;
	unsigned cap_sq[12];
	unsigned cap_type[12];
};

// Transposition table entry (16 bytes — fits one cache line per 4 entries)
struct TTEntry {
	uint64_t hash;   // full 64-bit hash to verify correctness
	int      score;  // stored score (mate scores adjusted for ply before storing)
	uint8_t  depth;  // depth at which the score was computed
	uint8_t  flag;   // TT_EXACT / TT_LOWERBOUND / TT_UPPERBOUND
	uint8_t  from;   // best-move hint: origin square (0 = no hint)
	uint8_t  to;     // best-move hint: destination square
};

// -------------------------   variables

extern bool StopRequest;
extern bool AnalyseMode;
extern int stm;
extern unsigned Board[45];
extern double PerftNodes;
extern Move *MP;
extern Move MoveBuffer[MOVE_BUFFER_LEN];
extern Move PV[MAX_DEPTH][MAX_DEPTH];
extern double Nodes;
extern unsigned Map_32_to_45[32];
extern unsigned Map_64_to_45[64];
extern unsigned Pieces;
extern EdAccess *ED;
extern unsigned EdPieces;
extern bool EdNocaptures;
extern bool Reversible[MAX_DEPTH];

// --- TZD Draw Detection ---
// Zobrist hashing for position identity and threefold-repetition detection
extern uint64_t ZobristTable[45][8]; // [square][piece_value & 7]
extern uint64_t ZobristSTM;          // XOR'd in when BLACK is to move
extern uint64_t CurrentHash;         // incrementally maintained current position hash
extern uint64_t HashStack[4096];     // undo stack (pushed in MakeMove, popped in UnmakeMove)
extern int      HashSP;              // hash stack pointer
extern uint64_t HashHistory[512];    // game-level position history (pushed by EI_Think/EI_MakeMove)
extern int      HashHistorySize;     // number of entries in HashHistory
extern int      GameReversibleCount; // consecutive reversible half-moves at game level
void InitZobrist();

extern TTEntry TT[TT_SIZE];
extern Move    KillerMoves[MAX_DEPTH][2]; // best quiet moves per ply for move ordering



typedef void (__stdcall *PF_SearchInfo)(int score, int depth, int speed, char *pv, char *cm);
extern PF_SearchInfo pfSearchInfo;
typedef void (__stdcall *PF_SearchInfoEx)(char *score, char *depth, char *speed, char **pv, char *cv);
extern PF_SearchInfoEx pfSearchInfoEx;



// -------------------------   prototypes

void NewGame();
void StrToMove(char *s, Move *m);
void MoveToStr(Move *m, char *s);
void SetupBoard(char *p);
void SetTimeControl(int base, int inc);
void SetTime(int time, int op_time);
void Init();
void Perft(unsigned depth);
void GenerateCaptures();
void GenerateAllMoves();
//void MakeMove(char *s);
void MakeMove(Move *m, unsigned ply);
void UnmakeMove(Move *m);
void PrintBoard();
void StartTimer();
int GetTimeElaps();
int Eval();
Move RootSearch();
int TreeSearch(int depth, unsigned ply, int rev_count, int alpha, int beta);
bool CheckTime();
int EdProbe();

#endif