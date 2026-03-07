#include "Checkers.h"

int PST_man[45] ={0,0,0,0,0,

        0,    0,    0,    0,
    25,   50,   50,   50,        0,
       25,   40,   50,   20,
    15,   30,   20,   20,        0,
       15,   25,   25,   10,
     5,   10,   10,   10,        0,
        5,    5,    5,    0,
     0,    5,   15,    5,
	 
0,0,0,0,0
};

int PST_king[45] = {0,0,0,0,0,

       20,    0,   10,   30,
    20,   20,   10,   30,        0,
       20,   20,   30,   10,
     0,   20,   30,   10,        0,
       10,   30,   20,    0,
    10,   30,   20,   20,        0,
       30,   10,   20,   20,
    30,   10,    0,   20,
	
0,0,0,0,0
};

int Eval()
{
	int score = 0;
	static const int dirs[4] = {-4, -5, 4, 5};

	for (unsigned sq = 5; sq < 40; ++sq)
	{
		unsigned p = Board[sq];
		if (!p) continue;

		if (p & WHITE)
		{
			if (p & KING)
			{
				score += KING_VALUE;
				score += PST_king[sq];
				// King mobility: each diagonal square reachable = +MOBILITY_BONUS.
				// Flying kings in TZD have far greater mobility than men; rewarding
				// reachable squares encourages centralization and open diagonals.
				for (int d = 0; d < 4; d++)
				{
					unsigned to = sq + dirs[d];
					while (Board[to] == 0) { score += MOBILITY_BONUS; to += dirs[d]; }
				}
			}
			else
			{
				score += MAN_VALUE;
				score += PST_man[sq];
			}
		}
		else // BLACK piece
		{
			if (p & KING)
			{
				score -= KING_VALUE;
				score -= PST_king[44 - sq];
				for (int d = 0; d < 4; d++)
				{
					unsigned to = sq + dirs[d];
					while (Board[to] == 0) { score -= MOBILITY_BONUS; to += dirs[d]; }
				}
			}
			else
			{
				score -= MAN_VALUE;
				score -= PST_man[44 - sq];
			}
		}
	}

	if (stm == BLACK) return -score;
	return score;
}
