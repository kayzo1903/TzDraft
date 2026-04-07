import { LeagueMatch } from './league-match.entity';

export enum LeagueRoundStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export class LeagueRound {
  constructor(
    public readonly id: string,
    public readonly leagueId: string,
    public readonly roundNumber: number,
    public status: LeagueRoundStatus,
    public deadline: Date | null = null,
    public matches: LeagueMatch[] = [],
  ) {}
}
