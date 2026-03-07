#ifdef _WIN32
#include <windows.h>
#define DLL_EXPORT __declspec(dllexport)
#define API_CALL __stdcall
#else
#define DLL_EXPORT
#define API_CALL
#define MB_OK 0
#define MessageBox(hwnd, text, caption, flags) fprintf(stderr, "%s: %s\n", caption, text)
#endif
#include <cstring>
#include <cstdio>
#include <fstream>
#include <iostream>

using namespace std;

#include "Checkers.h"
#include "EdAccess.h"

#ifndef _WIN32
extern "C" {
#endif

// ôóíêöèÿ îáðàòíîãî âûçîâà äëÿ îòîáðàæåíèÿ èíôîðìàöèè î õîäå âû÷èñëåíèé
// score - îöåíêà ïîçèöèè.
//         âûèãðûø ëó÷øå îáîçíà÷àòü òàê: 32767 - N, ãäå N ýòî êîëè÷åñòâî
//         ïîëóõîäîâ äî âûèãðûøà âûèãðûø ïî áåçðàíãîâîé áàçå, ëó÷øå îáîçíà÷àòü
//         òàê: 30000 - N
// depth - èíôîðìàöèÿ î ãëóáèíå ïåðåáîðà
// pv - ëó÷øèé âàðèàíò
// cm - õîä àíàëèçèðóåìûé â äàííûé ìîìåíò
typedef void(__stdcall *PF_SearchInfo)(int score, int depth, int speed,
                                       char *pv, char *cm);
PF_SearchInfo pfSearchInfo = 0;

// âòîðîé âàðèàíò
// âñå ïàðàìåòðû ñòðîêîâûå
// äëÿ óëó÷øåííîãî îòîáðàæåíèÿ èíôîðìàöèè î ïåðåáîðå
typedef void(__stdcall *PF_SearchInfoEx)(char *score, char *depth, char *speed,
                                         char **pv, char *cv);
PF_SearchInfoEx pfSearchInfoEx = 0;

// Ñäåëàòü õîä move
// Ôîðìàò õîäîâ: "a3b4" è "a3:b4:d6:e7". Òàêîé ôîðìàò ïîçâîëÿåò óñòðàíèòü âñå
// íåîäíîçíà÷íîñòè ïðè âçÿòèÿõ
DLL_EXPORT void API_CALL EI_MakeMove(char *move) {
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

DLL_EXPORT char *API_CALL EI_Think() {
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

// Çäåñü ìîæíî äåëàòü ÷òî óãîäíî è êàê óãîäíî äîëãî
// Ýòà ôóíêöèÿ âûçûâàåòñÿ â ìîìåíò êîãäà ïðîòèâíèê äóìàåò íàä ñâîèì õîäîì
DLL_EXPORT void API_CALL EI_Ponder() {
  // çäåñü ìîæíî íè÷åãî è íå äåëàòü :)
  return;
}

// Ïðîòèâíèê äåëàåò õîä move
// Ïåðåä ýòèì âûçûâàëàñü ôóíêöèÿ Ponder
// Çäåñü ñðàçó ìîæíî âåðíóòü õîä íà îñíîâå âû÷ècëåíèé ñäåëàííûõ â Ponder
// Ìîæíî ïîäóìàòü åùå è òîëüêî ïîñëå ýòîãî âåðíóòü õîä
DLL_EXPORT char *API_CALL EI_PonderHit(char *move) {
  EI_MakeMove(move);
  return EI_Think();
}

// Èíèöèàëèçàöèÿ äâèæêà
// si - ñì. âûøå îïèñàíèå PF_SearchInfo
// mem_lim - ëèìèò ïàìÿòè, êîòîðóþ ìîæåò èñïîëüçîâàòü äâèæîê
// çäåñü â îñíîâíîì èìååòñÿ ââèäó ðàçìåð õýø-òàáëèöû
DLL_EXPORT void API_CALL EI_Initialization(PF_SearchInfo si, int mem_lim) {
  pfSearchInfo = si;
}

// óñòàíîâêà óêàçàòåëÿ íà óëó÷øåííóþ ôóíêöèþ âûâîäà èíîðìàöèè î ïåðåáîðå
DLL_EXPORT void API_CALL EI_SetSearchInfoEx(PF_SearchInfoEx sie) {
  pfSearchInfoEx = sie;
}

DLL_EXPORT void API_CALL EI_NewGame() { NewGame(); }

// Çàêîí÷èòü âû÷èñëåíèÿ è âûéòè èç ôóíêöèé EI_Think, EI_Ponder, EI_PonderHit èëè
// EI_Analyse
DLL_EXPORT void API_CALL EI_Stop() { StopRequest = true; }

// Óñòàíîâèòü ïîçèöèþ pos íà äîñêå
// íàïðèìåð, íà÷àëüíàÿ ïîçèöèÿ bbbbbbbbbbbb........wwwwwwwwwwwww
// b - ïðîñòàÿ ÷åðíàÿ
// B - ÷åðíàÿ äàìêà
// w - ïðîñòàÿ áåëàÿ
// W - áåëàÿ äàìêà
// . - ïóñòîå ïîëå
// ïîëÿ ïåðå÷èñëÿþòñÿ òàê: b8, d8, f8, h8, a7, c7, ..., a1, c1, e1, g1
// ïîñëåäíèé ñèìâîë îïðåäåëÿåò î÷åðåäíîñòü õîäà
// w - áåëûå, b - ÷åðíûå
DLL_EXPORT void API_CALL EI_SetupBoard(char *pos) { SetupBoard(pos); }

// Óñòàíîâèòü êîíòðîëü âðåìåíè
// time ìèíóò íà ïàðòèþ
// inc ìèëëèñåêóíä - áîíóñ çà êàæäûé ñäåëàííûé õîä (÷àñû Ôèøåðà)
DLL_EXPORT void API_CALL EI_SetTimeControl(int time, int inc) {
  SetTimeControl(time, inc);
}

// Óñòàíîâèòü âðåìÿ â ìèëëèñåêóíäàõ îñòàâøååñÿ íà ÷àñàõ
// time - ñâîå âðåìÿ
// otime - âðåìÿ ïðîòèâíèêà
// âûçûâàåòñÿ ïåðåä êàæäûì õîäîì
DLL_EXPORT void API_CALL EI_SetTime(int time, int otime) {
  SetTime(time, otime);
}

// Âåðíóòü íàçâàíèå äâèæêà
DLL_EXPORT char *API_CALL EI_GetName() { return "SiDra 2"; }

// Âûçûâàåòñÿ ïåðåä âûãðóçêîé äâèæêà
DLL_EXPORT void API_CALL EI_OnExit() {}

// Àíàëèçèðîâàòü òåêóùóþ ïîçèöèþ
// Âûõîä èç ðåæèìà àíàëèçà îñóùåñòâëÿåòñÿ ïðè ïîëó÷åíèè êîìàíäû Stop
DLL_EXPORT void API_CALL EI_Analyse() {
  AnalyseMode = true;
  RootSearch();
  AnalyseMode = false;
}

// ôóíêöèÿ èíòåðôåéñà ýêñïîðòèðóåìàÿ èç dll
DLL_EXPORT void API_CALL EI_EGDB(EdAccess *eda) {
  ED = eda;
  if (ED) {
    EdPieces = ED->Load("russian");
    if (strstr(ED->GetBaseType(), "nocaptures")) {
      EdNocaptures = true;
    }
  }
}

#ifndef _WIN32
} // extern "C"
#endif

// Åñëè åñòü êàêèå-íèáóäü ïðåäëîæåíèÿ ïî ïîâîäó óëó÷øåíèÿ èíòåðôåéñà, òî áóäó
// ðàä èõ îáñóäèòü Ïèøèòå ïèñüìà igorkorshunov@yandex.ru èëè
// korshunov@gsu.unibel.by
