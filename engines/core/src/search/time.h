#ifndef SEARCH_TIME_H
#define SEARCH_TIME_H

#include <cstdint>
#include <chrono>

struct TimeManager {
    int64_t startMs;      // when search started
    int     timeLimitMs;  // original budget (0 = no limit)
    int     softLimitMs;  // current soft limit — may be extended on instability
    int     maxDepth;
    bool    infinite;
    int     prevScore;    // score from last completed iteration (for instability check)
};

void initTimeManager(TimeManager& tm, int timeLimitMs, int maxDepth, bool infinite);
int64_t elapsedMs(const TimeManager& tm);
bool    timeUp(const TimeManager& tm);

// Call after each completed depth iteration. Extends softLimitMs if the score
// changed significantly (position is unstable; more depth is likely to matter).
void extendIfUnstable(TimeManager& tm, int score);

#endif // SEARCH_TIME_H
