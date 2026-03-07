#ifdef _WIN32
#include <windows.h>
#endif
#include <iostream>
using namespace std;
#include <stdio.h>
#include <string>
#include <cstring>
#ifndef _WIN32
#include <cstdlib>
static char* itoa(int value, char* str, int base) {
    sprintf(str, base == 10 ? "%d" : "%x", value);
    return str;
}
#endif

#include "Checkers.h"
#include "EdAccess.h"

#define CHECK_INTERVAL 50000

bool StopRequest;
bool AnalyseMode;
double PerftNodes;
double CheckNodes;
int EdRoot[3];

void Perft(unsigned depth)
{
	Move *old_MP = MP;
	GenerateAllMoves();
	--depth;
	for (Move *m = old_MP; m < MP; ++m)
	{
		MakeMove(m, 0);
		if (depth) Perft(depth);
		else ++PerftNodes;
		UnmakeMove(m);
	}
	MP = old_MP;
}

char **pv_str = 0;
// m  - ������� ���
// cm - ����� �������� ����
// tm - ����� �����
void PrintPV(int depth, int score, unsigned cm, unsigned tm, Move *m)
{
	int time = GetTimeElaps();

	if (pfSearchInfoEx)
	{
		char str[64];

		// ������������� ������� ��� �������� ������� ��������
		if (!pv_str)
		{
			pv_str = new char *[2];
			pv_str[0] = new char[1024];
			pv_str[1] = new char[1];
			pv_str[1][0] = 0;
		}
		
		// ������ �������
		pv_str[0][0] = 0;
		for (unsigned i = 0; PV[0][i].from && i < 6; i++)
		{
			MoveToStr(&PV[0][i], str);
			if (pv_str[0][0]) strcat(pv_str[0], " ");
			strcat(pv_str[0], str);
			if (strlen(pv_str[0]) > 900) break;
		}

		// ������� ���
		char cm_str[32];
		if (time > 1000)
		{
			itoa(cm + 1, cm_str, 10);
			strcat(cm_str, "/");
			itoa(tm, cm_str + strlen(cm_str), 10);
			strcat(cm_str, " ");
			MoveToStr(m, cm_str + strlen(cm_str));
		}
		else cm_str[0] = 0;

		// ��������
		int speed = 0;
		if (time > 1000) speed = int (Nodes / time);
		char speed_str[16];
		itoa(speed, speed_str, 10);

		char score_str[16];
		if (abs(score) > ED_WIN - 1000)
		{
			if (score > 0) score_str[0] = '+';
			else score_str[0] = '-';
			if (abs(score) > WIN - 1000)
			{
				score_str[1] = 'X';
				itoa((WIN - abs(score) + 1) / 2, score_str + 2, 10);
			}
			else
			{
				score_str[1] = 'D';
				itoa((ED_WIN - abs(score) + 1) / 2, score_str + 2, 10);
			}
		}
		else itoa(score, score_str, 10);
		char depth_str[16];
		itoa(depth, depth_str, 10);

		pfSearchInfoEx(score_str, depth_str, speed_str, pv_str, cm_str);
		return;
	}
	else if (pfSearchInfo)
	{
		char str[64];

		// ������ �������
		std::string pv_str;
		for (unsigned i = 0; PV[0][i].from; i++)
		{
			MoveToStr(&PV[0][i], str);
			if (pv_str != "") pv_str += " ";
			pv_str += str;
		}

		// ������� ���
		std::string cm_str;
		if (time > 1000)
		{
			cm_str = itoa(cm + 1, str, 10);
			cm_str += "/";
			cm_str += itoa(tm, str, 10);
			cm_str += " ";
			MoveToStr(m, str);
			cm_str += str;
		}

		// ��������
		int speed = 0;
		if (time > 1000) speed = int (Nodes / time);

		pfSearchInfo(score, depth, speed, (char *)pv_str.c_str(), (char *)cm_str.c_str());
		return;
	}

	// ����� � ���������� ������
	cout.width(2);
	cout << depth << ' ';
	cout.width(3);
	cout << score << ' ';
	cout.width(6);
	cout << time << ' ';
	cout.width(10);
	cout.setf(ios::fixed);
	cout << Nodes << ' ';	
	char move[128];
	for (int i = 0; PV[0][i].from; ++i)
	{
		MoveToStr(&PV[0][i], move);
		if (i) cout << ' ';
		cout << move;
	}
	cout << endl;
	cout.flush();
}

// Quick piece-type counter used by draw-condition checks.
static void CountPieces(int &wm, int &wk, int &bm, int &bk)
{
	wm = wk = bm = bk = 0;
	for (unsigned sq = 5; sq < 40; ++sq)
	{
		unsigned p = Board[sq];
		if      (p == WHITE_MAN)  wm++;
		else if (p == WHITE_KING) wk++;
		else if (p == BLACK_MAN)  bm++;
		else if (p == BLACK_KING) bk++;
	}
}

// Helpers to store/retrieve mate-distance scores in the TT.
// Mate scores (abs > ED_WIN) are stored as distance-from-root so they're
// comparable regardless of which node they were first found at.
static inline int score_to_tt(int score, unsigned ply)
{
	if (score >  ED_WIN) return score + (int)ply;
	if (score < -ED_WIN) return score - (int)ply;
	return score;
}
static inline int score_from_tt(int score, unsigned ply)
{
	if (score >  ED_WIN) return score - (int)ply;
	if (score < -ED_WIN) return score + (int)ply;
	return score;
}

// Main negamax alpha-beta search.
// alpha  = best score the moving side is guaranteed so far (lower bound)
// beta   = the opponent's upper bound; scores >= beta cause a cutoff
// rev_count = consecutive reversible half-moves on path to this node
int TreeSearch(int depth, unsigned ply, int rev_count, int alpha, int beta)
{
	PV[ply][ply].from = 0;

	if (ply >= MAX_DEPTH) return Eval();

	// --- TZD Draw Detection (Article 8) ---

	// 8.3  30-move rule
	if (rev_count >= 60) return 0;

	// 8.2  Threefold repetition
	if (HashHistorySize >= 4)
	{
		int reps = 0;
		for (int h = 0; h < HashHistorySize; ++h)
			if (HashHistory[h] == CurrentHash && ++reps >= 2) return 0;
	}

	// 8.4 / 8.5  Piece-count based endgame draws
	if (Pieces <= 5)
	{
		int wm, wk, bm, bk;
		CountPieces(wm, wk, bm, bk);
		if ((wm + bm) == 0 && (wk + bk) <= 3 && (wk <= 2 || bk <= 2) && rev_count >= 10)
			return 0;
		bool w_dom = (wk >= 3 && bk == 1 && bm == 0 && wm == 0);
		bool b_dom = (bk >= 3 && wk == 1 && wm == 0 && bm == 0);
		if ((w_dom || b_dom) && rev_count >= 24) return 0;
	}

	// Time check
	if (Nodes >= CheckNodes)
	{
		CheckNodes = Nodes + CHECK_INTERVAL;
		if (!AnalyseMode && CheckTime()) { StopRequest = true; return 0; }
	}

	// --- Transposition Table Lookup ---
	int orig_alpha = alpha;
	TTEntry *tt = &TT[CurrentHash & TT_MASK];
	unsigned tt_from = 0, tt_to = 0;

	if (tt->hash == CurrentHash)
	{
		tt_from = tt->from;
		tt_to   = tt->to;
		if (tt->depth >= (uint8_t)depth)
		{
			int tt_score = score_from_tt(tt->score, ply);
			if (tt->flag == TT_EXACT)
			{
				// Exact hit: copy PV entry and return immediately
				PV[ply][ply].from = tt_from;
				PV[ply][ply].to   = tt_to;
				PV[ply][ply+1].from = 0;
				return tt_score;
			}
			if (tt->flag == TT_LOWERBOUND && tt_score > alpha) alpha = tt_score;
			if (tt->flag == TT_UPPERBOUND && tt_score < beta)  beta  = tt_score;
			if (alpha >= beta) return tt_score; // TT cutoff
		}
	}

	// --- Endgame Database Probe (pre-move-gen) ---
	if (!EdNocaptures && Pieces <= EdPieces)
	{
		int res = EdProbe();
		if (res != EdAccess::not_found && (res != EdRoot[stm] || !Reversible[ply - 1]))
		{
			if (res == EdAccess::win)  return ED_WIN - ply;
			if (res == EdAccess::lose) return -ED_WIN + ply;
			if (res == EdAccess::draw) return 0;
		}
	}

	// --- Move Generation ---
	Move *old_MP = MP;
	if (depth > 0) GenerateAllMoves();
	else
	{
		GenerateCaptures();
		if (MP == old_MP) return Eval(); // quiet position: stand-pat
	}

	// Endgame database probe (nocaptures variant — after move gen)
	if (EdNocaptures && Pieces <= EdPieces && !old_MP->cap_sq[0])
	{
		int res = EdProbe();
		if (res != EdAccess::not_found && (res != EdRoot[stm] || !Reversible[ply - 1]))
		{
			if (res == EdAccess::win)  { MP = old_MP; return ED_WIN - ply; }
			if (res == EdAccess::lose) { MP = old_MP; return -ED_WIN + ply; }
			if (res == EdAccess::draw) { MP = old_MP; return 0; }
		}
	}

	// --- Move Ordering ---
	// Step 1: bring TT best-move hint to the front
	if (tt_from)
	{
		for (Move *m = old_MP; m < MP; ++m)
		{
			if (m->from == tt_from && m->to == tt_to)
			{
				Move tmp = *old_MP; *old_MP = *m; *m = tmp;
				break;
			}
		}
	}

	// Step 2: bring killer moves to front of the quiet-move section
	// (captures are already before quiet moves in the list)
	if (ply < MAX_DEPTH)
	{
		Move *quiet_start = old_MP;
		while (quiet_start < MP && quiet_start->cap_sq[0]) ++quiet_start;

		for (int ki = 0; ki < 2; ki++)
		{
			unsigned kf = KillerMoves[ply][ki].from;
			if (!kf) continue;
			unsigned kt = KillerMoves[ply][ki].to;
			for (Move *m = quiet_start; m < MP; ++m)
			{
				if (m->from == kf && m->to == kt)
				{
					if (m != quiet_start) { Move tmp = *quiet_start; *quiet_start = *m; *m = tmp; }
					++quiet_start;
					break;
				}
			}
		}
	}

	// --- Alpha-Beta Search over Children ---
	int best_score = -WIN + ply;
	Move best_move; best_move.from = 0;

	for (Move *m = old_MP; m < MP; ++m)
	{
		MakeMove(m, ply);
		int new_rev = Reversible[ply] ? rev_count + 1 : 0;
		int score   = -TreeSearch(depth - 1, ply + 1, new_rev, -beta, -alpha);
		UnmakeMove(m);

		if (StopRequest) break;

		if (score > best_score)
		{
			best_score = score;
			best_move  = *m;

			if (score > alpha)
			{
				alpha = score;
				// Update principal variation only on real improvements
				PV[ply][ply] = *m;
				int i;
				for (i = ply + 1; PV[ply + 1][i].from; i++)
					PV[ply][i] = PV[ply + 1][i];
				PV[ply][i].from = 0;
			}

			if (alpha >= beta)
			{
				// Beta cutoff — record as killer if it's a quiet (non-capture) move
				if (!m->cap_sq[0] && ply < MAX_DEPTH)
				{
					if (KillerMoves[ply][0].from != m->from || KillerMoves[ply][0].to != m->to)
					{
						KillerMoves[ply][1] = KillerMoves[ply][0];
						KillerMoves[ply][0] = *m;
					}
				}
				break;
			}
		}
	}

	MP = old_MP;

	// --- Transposition Table Store ---
	if (!StopRequest && best_move.from)
	{
		int stored = score_to_tt(best_score, ply);
		uint8_t flag = (best_score <= orig_alpha) ? TT_UPPERBOUND
		             : (best_score >= beta)        ? TT_LOWERBOUND
		             :                               TT_EXACT;
		// Always overwrite — simplest replacement strategy
		tt->hash  = CurrentHash;
		tt->score = stored;
		tt->depth = (uint8_t)(depth < 255 ? depth : 255);
		tt->flag  = flag;
		tt->from  = (uint8_t)best_move.from;
		tt->to    = (uint8_t)best_move.to;
	}

	return best_score;
}

// ����� � ����� ������ �����
Move RootSearch()
{
	StartTimer();

	StopRequest = false;

	Nodes = 0;
	CheckNodes = CHECK_INTERVAL;

	// ��������� �����
	MP = MoveBuffer;
	GenerateAllMoves();
	if (MP == MoveBuffer) return *MP;
	if (!AnalyseMode && MP == MoveBuffer + 1)
	{
		// ������������ ��� ���������� �����
		MP = MoveBuffer;
		return *MP;
	}

	if (!EdNocaptures || !MoveBuffer[0].cap_sq[0]) EdRoot[stm] = EdProbe();
	else EdRoot[stm] = EdAccess::not_found;
	if (EdRoot[stm] == EdAccess::win) EdRoot[stm ^ CHANGE_COLOR] = EdAccess::lose;
	else if (EdRoot[stm] == EdAccess::lose) EdRoot[stm ^ CHANGE_COLOR] = EdAccess::win;
	else EdRoot[stm ^ CHANGE_COLOR] = EdRoot[stm];

	int last_score = 0;

	// Iterative deepening
	for (int depth = 1; depth < MAX_DEPTH; depth++)
	{
		int best_score = -WIN;
		// root_alpha tracks the best score seen so far this iteration.
		// It is passed as alpha to TreeSearch so internal nodes can prune
		// branches that are provably worse than what we already have.
		int root_alpha = -WIN;

		for (Move *m = MoveBuffer; m < MP; m++)
		{
			PrintPV(depth, last_score, m - MoveBuffer, MP - MoveBuffer, m);

			MakeMove(m, 0);
			int new_rev = Reversible[0] ? GameReversibleCount + 1 : 0;
			// Search with alpha = root_alpha so subsequent root moves can be
			// cut off once we know they can't beat the current best.
			int score   = -TreeSearch(depth - 1, 1, new_rev, -WIN, -root_alpha);
			UnmakeMove(m);

			if (StopRequest) break;

			if (score > best_score)
			{
				best_score = score;
				root_alpha = score; // tighten alpha for subsequent root moves

				// Update PV
				PV[0][0] = *m;
				unsigned i;
				for (i = 1; PV[1][i].from; i++)
					PV[0][i] = PV[1][i];
				PV[0][i].from = 0;

				// Move the best root move to the front for next iteration
				Move best = *m;
				for (Move *pm = m; pm > MoveBuffer; pm--) *pm = *(pm - 1);
				*MoveBuffer = best;
			}
			PrintPV(depth, last_score = best_score, m - MoveBuffer, MP - MoveBuffer, m);
		}

		if (StopRequest) break;
	}

	MP = MoveBuffer;
	return PV[0][0];
}
