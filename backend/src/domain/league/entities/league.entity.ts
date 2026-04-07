import { LeagueParticipant } from './league-participant.entity';
import { LeagueRound } from './league-round.entity';
import { LeagueMatch } from './league-match.entity';

export enum LeagueStatus {
  REGISTRATION = 'REGISTRATION',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class League {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public status: LeagueStatus,
    public currentRound: number,
    public readonly maxPlayers: number,
    public readonly roundDurationDays: number,
    public readonly createdById: string,
    public readonly createdAt: Date,
    public startDate: Date | null = null,
    public endDate: Date | null = null,
    public participants: LeagueParticipant[] = [],
    public rounds: LeagueRound[] = [],
    public matches: LeagueMatch[] = [],
  ) {}

  isRegistrationOpen(): boolean {
    return this.status === LeagueStatus.REGISTRATION;
  }

  isFull(): boolean {
    return this.participants.length >= this.maxPlayers;
  }

  canStart(): boolean {
    return this.status === LeagueStatus.REGISTRATION && this.participants.length === this.maxPlayers;
  }

  isActive(): boolean {
    return this.status === LeagueStatus.ACTIVE;
  }
}
