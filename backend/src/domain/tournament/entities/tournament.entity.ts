import { TournamentPrize } from './tournament-prize.entity';
export { TournamentPrize };

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  ROUND_ROBIN = 'ROUND_ROBIN',
  SWISS = 'SWISS',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
}

export enum TournamentStyle {
  BLITZ = 'BLITZ',
  RAPID = 'RAPID',
  CLASSICAL = 'CLASSICAL',
  UNLIMITED = 'UNLIMITED',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION = 'REGISTRATION',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TournamentScope {
  GLOBAL = 'GLOBAL',
  COUNTRY = 'COUNTRY',
  REGION = 'REGION',
}

export const FORMAT_MAX_PLAYERS: Record<TournamentFormat, number> = {
  [TournamentFormat.SINGLE_ELIMINATION]: 32,
  [TournamentFormat.ROUND_ROBIN]: 12,
  [TournamentFormat.SWISS]: 64,
  [TournamentFormat.DOUBLE_ELIMINATION]: 16,
};

export class Tournament {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly descriptionEn: string,
    public readonly descriptionSw: string,
    public readonly format: TournamentFormat,
    public readonly style: TournamentStyle,
    public status: TournamentStatus,
    public readonly scope: TournamentScope,
    public readonly maxPlayers: number,
    public readonly minPlayers: number,
    public readonly scheduledStartAt: Date,
    public readonly createdById: string,
    public readonly createdAt: Date,
    public readonly country: string | null = null,
    public readonly region: string | null = null,
    public readonly rulesEn: string | null = null,
    public readonly rulesSw: string | null = null,
    public readonly minElo: number | null = null,
    public readonly maxElo: number | null = null,
    public readonly minMatchmakingWins: number | null = null,
    public readonly minAiLevelBeaten: number | null = null,
    public readonly requiredAiLevelPlayed: number | null = null,
    public readonly registrationDeadline: Date | null = null,
    public readonly prizes: TournamentPrize[] = [],
    public readonly hidden: boolean = false,
    public currentRound: number = 0,
    public readonly roundDurationMinutes: number = 10080,
  ) {}

  isRegistrationOpen(): boolean {
    if (this.status !== TournamentStatus.REGISTRATION) {
      return false;
    }

    const now = new Date();

    if (this.registrationDeadline && this.registrationDeadline <= now) {
      return false;
    }

    if (this.scheduledStartAt <= now) {
      return false;
    }

    return true;
  }

  isActive(): boolean {
    return this.status === TournamentStatus.ACTIVE;
  }

  isFull(currentCount: number): boolean {
    return currentCount >= this.maxPlayers;
  }
}
