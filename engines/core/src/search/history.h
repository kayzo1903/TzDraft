#ifndef SEARCH_HISTORY_H
#define SEARCH_HISTORY_H

// History heuristic: tracks how often a (from,to) move caused a beta cutoff.
// Indexed by [side][from][to].
extern int historyTable[2][32][32];

void clearHistory();
void updateHistory(int side, int from, int to, int depth);
int  getHistory(int side, int from, int to);

#endif // SEARCH_HISTORY_H
