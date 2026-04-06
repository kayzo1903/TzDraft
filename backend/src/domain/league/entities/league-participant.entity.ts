export enum LeagueParticipantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISQUALIFIED = 'DISQUALIFIED',
  WITHDRAWN = 'WITHDRAWN',
}

export class LeagueParticipant {
  constructor(
    public readonly id: string,
    public readonly leagueId: string,
    public readonly userId: string,
    public status: LeagueParticipantStatus,
    public matchPoints: number,
    public matchWins: number,
    public matchDraws: number,
    public matchLosses: number,
    public matchesPlayed: number,
    public consecutiveMissed: number,
    public goalsFor: number,
    public goalsAgainst: number,
    public goalDifference: number,
    public readonly registeredAt: Date,
  ) {}
}
