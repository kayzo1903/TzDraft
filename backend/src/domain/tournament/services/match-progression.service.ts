import { Injectable } from '@nestjs/common';
import {
  TournamentMatch,
  MatchGameResult,
  MatchResult,
} from '../entities/tournament-match.entity';
import { TournamentMatchGame } from '../entities/tournament-match-game.entity';

export type ProgressionDecision =
  | { action: 'SPAWN_NEXT'; gameNumber: number; isExtra: boolean }
  | {
      action: 'END_MATCH';
      result: MatchResult;
      winnerId: string;
      loserId: string | null;
      score: string;
    };

@Injectable()
export class MatchProgressionService {
  /**
   * Pure function — no DB, no WS.
   * Given the current match state and the result of the game that just ended,
   * returns what should happen next.
   */
  decide(
    match: TournamentMatch,
    gameResult: MatchGameResult,
  ): ProgressionDecision {
    // Apply game result to match counters (we mutate a copy)
    const m = this.applyResult(match, gameResult);

    // Check consecutive-loss early exit
    if (m.player2ConsecLoss >= 2) {
      return this.endMatch(m, MatchResult.PLAYER1_WIN);
    }
    if (m.player1ConsecLoss >= 2) {
      return this.endMatch(m, MatchResult.PLAYER2_WIN);
    }

    // After 3+ games (including extras), check wins
    if (m.gamesPlayed >= 3) {
      if (m.player1Wins > m.player2Wins) {
        return this.endMatch(m, MatchResult.PLAYER1_WIN);
      }
      if (m.player2Wins > m.player1Wins) {
        return this.endMatch(m, MatchResult.PLAYER2_WIN);
      }
      // Tied — spawn extra game
      const nextGameNumber = m.gamesPlayed + 1;
      return {
        action: 'SPAWN_NEXT',
        gameNumber: nextGameNumber,
        isExtra: true,
      };
    }

    // Still within the base 3 games
    const nextGameNumber = m.gamesPlayed + 1;
    return { action: 'SPAWN_NEXT', gameNumber: nextGameNumber, isExtra: false };
  }

  /**
   * Apply gameResult to a copy of the match counters.
   * Does NOT mutate the original — caller persists the final state.
   */
  applyResult(
    match: TournamentMatch,
    gameResult: MatchGameResult,
  ): TournamentMatch {
    const copy = Object.assign(
      Object.create(Object.getPrototypeOf(match)),
      match,
    ) as TournamentMatch;

    (copy as any).gamesPlayed = match.gamesPlayed + 1;

    if (gameResult === MatchGameResult.PLAYER1_WIN) {
      (copy as any).player1Wins = match.player1Wins + 1;
      (copy as any).player1ConsecLoss = 0;
      (copy as any).player2ConsecLoss = match.player2ConsecLoss + 1;
    } else if (gameResult === MatchGameResult.PLAYER2_WIN) {
      (copy as any).player2Wins = match.player2Wins + 1;
      (copy as any).player2ConsecLoss = 0;
      (copy as any).player1ConsecLoss = match.player1ConsecLoss + 1;
    } else {
      // DRAW — reset consecutive loss counters for both
      (copy as any).player1ConsecLoss = 0;
      (copy as any).player2ConsecLoss = 0;
    }

    return copy;
  }

  private endMatch(
    match: TournamentMatch,
    result: MatchResult,
  ): ProgressionDecision {
    const winnerId =
      result === MatchResult.PLAYER1_WIN ? match.player1Id! : match.player2Id!;
    const loserId =
      result === MatchResult.PLAYER1_WIN ? match.player2Id : match.player1Id;
    const score = `${match.player1Wins}–${match.player2Wins}`;
    return {
      action: 'END_MATCH',
      result,
      winnerId,
      loserId: loserId ?? null,
      score,
    };
  }
}
