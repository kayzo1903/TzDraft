#ifdef _WIN32
#include <windows.h>
#else
#include <chrono>
#endif

int StartTime;
int TimeRemaining = 300000;
int BaseTime;
int IncTime;
int TimeForMove;

unsigned int GetCurrentTimeMs() {
#ifdef _WIN32
	return GetTickCount();
#else
	using namespace std::chrono;
	return (unsigned int)duration_cast<milliseconds>(steady_clock::now().time_since_epoch()).count();
#endif
}

void StartTimer()
{
	StartTime = GetCurrentTimeMs();
	TimeForMove = TimeRemaining / 20 + IncTime;
	if (TimeForMove > TimeRemaining / 3) TimeForMove = TimeRemaining / 3;
}

int GetTimeElaps()
{
	return GetCurrentTimeMs() - StartTime;
}

void SetTime(int time, int op_time)
{
	TimeRemaining = time;
}

void SetTimeControl(int base, int inc)
{
	BaseTime = base * 1000 * 60;
	IncTime = inc;
}

bool CheckTime()
{
	if (GetTimeElaps() >= TimeForMove) return true;
	return false;
}
