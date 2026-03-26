#include "search/time.h"

static int64_t nowMs() {
    using namespace std::chrono;
    return duration_cast<milliseconds>(steady_clock::now().time_since_epoch()).count();
}

void initTimeManager(TimeManager& tm, int timeLimitMs, int maxDepth, bool infinite) {
    tm.startMs     = nowMs();
    tm.timeLimitMs = timeLimitMs;
    tm.maxDepth    = maxDepth;
    tm.infinite    = infinite;
}

int64_t elapsedMs(const TimeManager& tm) {
    return nowMs() - tm.startMs;
}

bool timeUp(const TimeManager& tm) {
    if (tm.infinite) return false;
    if (tm.timeLimitMs <= 0) return false;
    return elapsedMs(tm) >= tm.timeLimitMs;
}
