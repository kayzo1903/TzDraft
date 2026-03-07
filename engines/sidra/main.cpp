#ifdef _WIN32
#include <windows.h>
#endif
#include <fstream>
using namespace std;

#include "Checkers.h"
#include "EdAccess.h"

// ������� ��������� ������ ��� ����������� ���������� � ���� ����������
// score - ������ �������.
//         ������� ����� ���������� ���: 32767 - N, ��� N ��� ���������� ��������� �� ��������
//         ������� �� ����������� ����, ����� ���������� ���: 30000 - N
// depth - ���������� � ������� ��������
// pv - ������ �������
// cm - ��� ������������� � ������ ������
typedef void (__stdcall *PF_SearchInfo)(int score, int depth, int speed, char *pv, char *cm);
PF_SearchInfo pfSearchInfo = 0;

// ������ �������
// ��� ��������� ���������
// ��� ����������� ����������� ���������� � ��������
typedef void (__stdcall *PF_SearchInfoEx)(char *score, char *depth, char *speed, char **pv, char *cv);
PF_SearchInfoEx pfSearchInfoEx = 0;

// ������� ��� move
// ������ �����: "a3b4" � "a3:b4:d6:e7". ����� ������ ��������� ��������� ��� ��������������� ��� �������
__declspec(dllexport) void __stdcall EI_MakeMove(char *move)
{
	Move m;
	StrToMove(move, &m);
	if (!m.from) {
		MessageBox(0, "SiDra: move not found", move, MB_OK);
	} else {
		MakeMove(&m, 0);
		// Record position for threefold-repetition and 30-move rule (TZD Article 8)
		if (HashHistorySize < 511)
			HashHistory[HashHistorySize++] = CurrentHash;
		GameReversibleCount = Reversible[0] ? GameReversibleCount + 1 : 0;
	}
}

__declspec(dllexport) char * __stdcall EI_Think()
{
	static char move_buf[128];
	Move m = RootSearch();
	MakeMove(&m, 0);
	// Record position for threefold-repetition and 30-move rule (TZD Article 8)
	if (HashHistorySize < 511)
		HashHistory[HashHistorySize++] = CurrentHash;
	GameReversibleCount = Reversible[0] ? GameReversibleCount + 1 : 0;
	MoveToStr(&m, move_buf);
	return move_buf;
}

// ����� ����� ������ ��� ������ � ��� ������ �����
// ��� ������� ���������� � ������ ����� ��������� ������ ��� ����� �����
__declspec(dllexport) void __stdcall EI_Ponder()
{
	// ����� ����� ������ � �� ������ :)
	return;
}

// ��������� ������ ��� move
// ����� ���� ���������� ������� Ponder
// ����� ����� ����� ������� ��� �� ������ ����c����� ��������� � Ponder
// ����� �������� ��� � ������ ����� ����� ������� ���
__declspec(dllexport) char * __stdcall EI_PonderHit(char *move)
{
	EI_MakeMove(move);
	return EI_Think();
}

// ������������� ������
// si - ��. ���� �������� PF_SearchInfo
// mem_lim - ����� ������, ������� ����� ������������ ������
// ����� � �������� ������� ����� ������ ���-�������
__declspec(dllexport) void __stdcall EI_Initialization(PF_SearchInfo si, int mem_lim)
{
	pfSearchInfo = si;
}


// ��������� ��������� �� ���������� ������� ������ ��������� � ��������
__declspec(dllexport) void __stdcall EI_SetSearchInfoEx(PF_SearchInfoEx sie)
{
	pfSearchInfoEx = sie;
}

__declspec(dllexport) void __stdcall EI_NewGame()
{
	NewGame();
}

// ��������� ���������� � ����� �� ������� EI_Think, EI_Ponder, EI_PonderHit ��� EI_Analyse
__declspec(dllexport) void __stdcall EI_Stop()
{
	StopRequest = true;
}

// ���������� ������� pos �� �����
// ��������, ��������� ������� bbbbbbbbbbbb........wwwwwwwwwwwww
// b - ������� ������
// B - ������ �����
// w - ������� �����
// W - ����� �����
// . - ������ ����
// ���� ������������� ���: b8, d8, f8, h8, a7, c7, ..., a1, c1, e1, g1
// ��������� ������ ���������� ����������� ����
// w - �����, b - ������
__declspec(dllexport) void __stdcall EI_SetupBoard(char *pos)
{
	SetupBoard(pos);
}

// ���������� �������� �������
// time ����� �� ������
// inc ����������� - ����� �� ������ ��������� ��� (���� ������)
__declspec(dllexport) void __stdcall EI_SetTimeControl(int time, int inc)
{
	SetTimeControl(time, inc);
}
	
// ���������� ����� � ������������� ���������� �� �����
// time - ���� �����
// otime - ����� ����������
// ���������� ����� ������ �����
__declspec(dllexport) void __stdcall EI_SetTime(int time, int otime)
{
	SetTime(time, otime);
}

// ������� �������� ������
__declspec(dllexport) char * __stdcall EI_GetName()
{
	return "SiDra 2";
}

// ���������� ����� ��������� ������
__declspec(dllexport) void __stdcall EI_OnExit()
{
}

// ������������� ������� �������
// ����� �� ������ ������� �������������� ��� ��������� ������� Stop
__declspec(dllexport) void __stdcall EI_Analyse()
{
	AnalyseMode = true;
	RootSearch();
	AnalyseMode = false;
}

// ������� ���������� �������������� �� dll
__declspec(dllexport) void __stdcall EI_EGDB(EdAccess *eda)
{
	ED = eda;
	if (ED)
	{
		EdPieces = ED->Load("russian");
		if (strstr(ED->GetBaseType(), "nocaptures"))
		{
			EdNocaptures = true;
		}
	}
}

// ���� ���� �����-������ ����������� �� ������ ��������� ����������, �� ���� ��� �� ��������
// ������ ������ igorkorshunov@yandex.ru ��� korshunov@gsu.unibel.by
