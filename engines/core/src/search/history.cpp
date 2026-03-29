#include "search/history.h"
#include <cstring>

int historyTable[2][32][32];

void clearHistory() {
    memset(historyTable, 0, sizeof(historyTable));
}

void updateHistory(int side, int from, int to, int depth) {
    historyTable[side][from][to] += depth * depth;
    // Cap to prevent overflow
    if (historyTable[side][from][to] > 1000000) {
        historyTable[side][from][to] = 1000000;
    }
}

int getHistory(int side, int from, int to) {
    return historyTable[side][from][to];
}
