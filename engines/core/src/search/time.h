#ifndef SEARCH_TIME_H
#define SEARCH_TIME_H

#include <cstdint>
#include <chrono>

struct TimeManager {
    int64_t startMs;      // when search started (ms since epoch)
    int     timeLimitMs;  // 0 = no limit
    int     maxDepth;     // 0 = no limit
    bool    infinite;     // true = search until stop command
};

// Initialize the time manager
void initTimeManager(TimeManager& tm, int timeLimitMs, int maxDepth, bool infinite);

// Returns elapsed time in ms
int64_t elapsedMs(const TimeManager& tm);

// Returns true if the search should stop due to time
bool timeUp(const TimeManager& tm);

#endif // SEARCH_TIME_H
