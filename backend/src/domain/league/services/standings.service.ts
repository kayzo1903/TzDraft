import { Injectable } from '@nestjs/common';
import { LeagueParticipant } from '../entities/league-participant.entity';

@Injectable()
export class StandingsService {
  /**
   * Sorts the standings table based on Football rules:
   * 1. Match Points
   * 2. Goal Difference (GD)
   * 3. Goals For (GF)
   * 4. Head-to-head match result between tied players (TODO if needed)
   * 5. Head-to-head GD between tied players (TODO if needed)
   */
  sortStandings(participants: LeagueParticipant[]): LeagueParticipant[] {
    return [...participants].sort((a, b) => {
      // 1. Match Points
      if (b.matchPoints !== a.matchPoints) {
        return b.matchPoints - a.matchPoints;
      }
      // 2. Goal Difference
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      // 3. Goals For
      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }
      
      // Fallback: alphabetical order for consistent ties
      return a.userId.localeCompare(b.userId);
    });
  }
}
