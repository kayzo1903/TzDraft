#include "search/time.h"

static int64_t nowMs() {
    using namespace std::chrono;
    return duration_cast<milliseconds>(steady_clock::now().time_since_epoch()).count();
}

void initTimeManager(TimeManager& tm, int timeLimitMs, int maxDepth, bool infinite) {
    tm.startMs     = nowMs();
    tm.timeLimitMs = timeLimitMs;
    tm.softLimitMs = timeLimitMs;
    tm.maxDepth    = maxDepth;
    tm.infinite    = infinite;
    tm.prevScore   = 0;
}

int64_t elapsedMs(const TimeManager& tm) {
    return nowMs() - tm.startMs;
}

bool timeUp(const TimeManager& tm) {
    if (tm.infinite) return false;
    if (tm.softLimitMs <= 0) return false;
    return elapsedMs(tm) >= tm.softLimitMs;
}

void extendIfUnstable(TimeManager& tm, int score) {
    if (tm.timeLimitMs <= 0) return;  // no time limit — nothing to extend
    int delta = score - tm.prevScore;
    if (delta < 0) delta = -delta;
    if (delta >= 50) {
        // Score swung by ≥50 cp: position is unstable, grant up to 50% more time.
        // Hard cap at 2× the original budget to prevent runaway extension.
        int extended = tm.softLimitMs + tm.timeLimitMs / 2;
        int cap      = tm.timeLimitMs * 2;
        tm.softLimitMs = (extended < cap) ? extended : cap;
    }
    tm.prevScore = score;
}
