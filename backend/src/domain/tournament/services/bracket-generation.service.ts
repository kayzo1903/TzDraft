import { Injectable } from '@nestjs/common';
import { TournamentParticipant } from '../entities/tournament-participant.entity';
import { MatchResult, MatchStatus } from '../entities/tournament-match.entity';

export interface MatchStub {
  roundId: string;
  tournamentId: string;
  player1Id: string | null;
  player2Id: string | null;
  isBye: boolean;
}

@Injectable()
export class BracketGenerationService {
  /**
   * Sort participants by ELO descending and assign seeds 1..N.
   * Seed 1 = highest ELO.
   */
  assignSeeds(participants: TournamentParticipant[]): TournamentParticipant[] {
    const sorted = [...participants].sort(
      (a, b) => b.eloAtSignup - a.eloAtSignup,
    );
    sorted.forEach((p, i) => {
      p.seed = i + 1;
    });
    return sorted;
  }

  /**
   * Generate round 1 pairings for Single Elimination.
   * Top seeds get BYEs when N is not a power of 2.
   *
   * Standard seeded pairing: seed 1 vs seed N, seed 2 vs seed N-1, ...
   * BYEs fill the "missing" lower-seed slots.
   *
   * Returns match stubs (no IDs yet — caller persists).
   */
  generateRound1(
    seededParticipants: TournamentParticipant[],
    roundId: string,
    tournamentId: string,
  ): MatchStub[] {
    const n = seededParticipants.length;
    const bracketSize = this.nextPowerOfTwo(n);
    const byeCount = bracketSize - n;

    // Build padded array: indices 0..bracketSize-1
    // Seed k is at index k-1. Slots for "missing" seeds are null (BYE).
    const slots: (TournamentParticipant | null)[] = new Array(bracketSize).fill(
      null,
    );
    seededParticipants.forEach((p) => {
      slots[(p.seed ?? 1) - 1] = p;
    });

    // Standard pairing: slot[i] vs slot[bracketSize - 1 - i] for i = 0 .. bracketSize/2 - 1
    const stubs: MatchStub[] = [];
    for (let i = 0; i < bracketSize / 2; i++) {
      const p1 = slots[i];
      const p2 = slots[bracketSize - 1 - i];
      const isBye = p2 === null; // top seeds face a null slot (BYE)

      stubs.push({
        roundId,
        tournamentId,
        player1Id: p1?.userId ?? null,
        player2Id: p2?.userId ?? null,
        isBye,
      });
    }

    return stubs;
  }

  /**
   * Generate next-round pairings from winners of current round.
   * Winners are paired in order: winner[0] vs winner[1], winner[2] vs winner[3], ...
   */
  generateNextRound(
    winners: { userId: string; seed: number | null }[],
    roundId: string,
    tournamentId: string,
  ): MatchStub[] {
    // Sort by seed ascending so bracket order is preserved
    const sorted = [...winners].sort(
      (a, b) => (a.seed ?? 999) - (b.seed ?? 999),
    );
    const stubs: MatchStub[] = [];

    for (let i = 0; i < sorted.length; i += 2) {
      stubs.push({
        roundId,
        tournamentId,
        player1Id: sorted[i]?.userId ?? null,
        player2Id: sorted[i + 1]?.userId ?? null,
        isBye: !sorted[i + 1], // odd winner count — shouldn't happen in SE
      });
    }

    return stubs;
  }

  totalRounds(playerCount: number): number {
    return Math.ceil(Math.log2(playerCount));
  }

  private nextPowerOfTwo(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }
}
