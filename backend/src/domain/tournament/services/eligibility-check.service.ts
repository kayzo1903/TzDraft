import { Injectable } from '@nestjs/common';
import { Tournament } from '../entities/tournament.entity';

export interface EligibilityResult {
  eligible: boolean;
  checks: EligibilityCheck[];
}

export interface EligibilityCheck {
  key: string;
  passed: boolean;
  required: string | number | null;
  current: string | number | null;
}

export interface UserEligibilityData {
  country: string | null;
  region: string | null;
  elo: number;
  matchmakingWins: number;
  highestAiLevelBeaten: number | null;
  highestAiLevelPlayed: number | null;
}

@Injectable()
export class EligibilityCheckService {
  check(tournament: Tournament, user: UserEligibilityData): EligibilityResult {
    const checks: EligibilityCheck[] = [];

    if (tournament.minElo !== null) {
      checks.push({
        key: 'minElo',
        passed: user.elo >= tournament.minElo,
        required: tournament.minElo,
        current: user.elo,
      });
    }

    if (tournament.maxElo !== null) {
      checks.push({
        key: 'maxElo',
        passed: user.elo <= tournament.maxElo,
        required: tournament.maxElo,
        current: user.elo,
      });
    }

    if (tournament.minMatchmakingWins !== null) {
      checks.push({
        key: 'minMatchmakingWins',
        passed: user.matchmakingWins >= tournament.minMatchmakingWins,
        required: tournament.minMatchmakingWins,
        current: user.matchmakingWins,
      });
    }

    if (tournament.minAiLevelBeaten !== null) {
      const beaten = user.highestAiLevelBeaten ?? 0;
      checks.push({
        key: 'minAiLevelBeaten',
        passed: beaten >= tournament.minAiLevelBeaten,
        required: tournament.minAiLevelBeaten,
        current: beaten,
      });
    }

    if (tournament.requiredAiLevelPlayed !== null) {
      const played = user.highestAiLevelPlayed ?? 0;
      checks.push({
        key: 'requiredAiLevelPlayed',
        passed: played >= tournament.requiredAiLevelPlayed,
        required: tournament.requiredAiLevelPlayed,
        current: played,
      });
    }

    if (tournament.scope === 'COUNTRY' && tournament.country) {
      checks.push({
        key: 'country',
        passed:
          user.country?.toLowerCase() === tournament.country.toLowerCase(),
        required: tournament.country,
        current: user.country,
      });
    }

    if (tournament.scope === 'REGION' && tournament.region) {
      if (tournament.country) {
        checks.push({
          key: 'country',
          passed:
            user.country?.toLowerCase() === tournament.country.toLowerCase(),
          required: tournament.country,
          current: user.country,
        });
      }
      checks.push({
        key: 'region',
        passed: user.region?.toLowerCase() === tournament.region.toLowerCase(),
        required: tournament.region,
        current: user.region,
      });
    }

    return {
      eligible: checks.every((c) => c.passed),
      checks,
    };
  }
}
