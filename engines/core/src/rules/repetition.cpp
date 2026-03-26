#include "rules/repetition.h"

constexpr int MAX_GAME_PLY = 512;
static uint64_t hashHistory[MAX_GAME_PLY];
static int historyLen = 0;

void clearHashHistory() {
    historyLen = 0;
}

void pushHash(uint64_t h) {
    if (historyLen < MAX_GAME_PLY) {
        hashHistory[historyLen++] = h;
    }
}

void popHash() {
    if (historyLen > 0) {
        --historyLen;
    }
}

bool isRepetitionHash(uint64_t hash, int threshold) {
    // Count the current position as the first occurrence, then look for
    // prior matching ancestor positions in the stored history.
    int count = 1;
    for (int i = 0; i < historyLen; i++) {
        if (hashHistory[i] == hash) {
            count++;
            if (count >= threshold) return true;
        }
    }
    return false;
}
