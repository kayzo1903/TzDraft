import { Injectable } from '@nestjs/common';
import { LeagueMatch, LeagueMatchResult } from '../entities/league-match.entity';

export interface ComputedMatchResult {
  result: LeagueMatchResult;
  p1Points: number;
  p2Points: number;
}

@Injectable()
export class MatchResultService {
  /**
   * Computes match result and points from final game goals.
   */
  computeMatchResult(player1Goals: number, player2Goals: number): ComputedMatchResult {
    if (player1Goals > player2Goals) {
      return { result: LeagueMatchResult.PLAYER1_WIN, p1Points: 3, p2Points: 0 };
    } else if (player2Goals > player1Goals) {
      return { result: LeagueMatchResult.PLAYER2_WIN, p1Points: 0, p2Points: 3 };
    } else {
      return { result: LeagueMatchResult.DRAW, p1Points: 1, p2Points: 1 };
    }
  }

  /**
   * Computes match goals given previous goals and a new forfeited game.
   */
  getForfeitedGameGoals(forfeiterId: string, player1Id: string): { p1Add: number; p2Add: number } {
    if (forfeiterId === player1Id) {
      return { p1Add: 0, p2Add: 1 }; // Opponent gets 1 goal
    } else {
      return { p1Add: 1, p2Add: 0 };
    }
  }
}
