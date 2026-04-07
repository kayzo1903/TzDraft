import { Injectable } from '@nestjs/common';

export interface LeagueMatchStub {
  player1Id: string;
  player2Id: string;
  roundNumber: number;
}

@Injectable()
export class ScheduleGenerationService {
  /**
   * Generates a single round-robin schedule for an EVEN number of players
   * using the circle method. Fixes the first player, rotates the rest.
   * Total rounds = N - 1. Total matches per round = N / 2.
   */
  generateSchedule(playerIds: string[]): LeagueMatchStub[] {
    const n = playerIds.length;
    if (n % 2 !== 0) {
      throw new Error('Circle method requires an even number of players.');
    }

    const matches: LeagueMatchStub[] = [];
    const numRounds = n - 1;
    const matchesPerRound = n / 2;

    // We keep player 0 fixed at the top-left, and rotate the rest
    const fixedPlayer = playerIds[0];
    const rotatingPlayers = playerIds.slice(1);

    for (let round = 0; round < numRounds; round++) {
      const roundNumber = round + 1;
      
      for (let i = 0; i < matchesPerRound; i++) {
        let p1: string;
        let p2: string;

        if (i === 0) {
          p1 = fixedPlayer;
          p2 = rotatingPlayers[round];
          // Alternate home/away for the fixed player (optional for draughts, but good practice)
          if (round % 2 === 1) {
            const temp = p1;
            p1 = p2;
            p2 = temp;
          }
        } else {
          // Map to correct rotating players index
          const p1Idx = (round + i) % (n - 1);
          const p2Idx = (round + (n - 1 - i)) % (n - 1);
          p1 = rotatingPlayers[p1Idx];
          p2 = rotatingPlayers[p2Idx];
        }

        matches.push({
          player1Id: p1,
          player2Id: p2,
          roundNumber,
        });
      }
    }

    return matches;
  }
}
