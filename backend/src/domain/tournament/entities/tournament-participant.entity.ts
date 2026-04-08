export enum ParticipantStatus {
  REGISTERED = 'REGISTERED',
  ACTIVE = 'ACTIVE',
  ELIMINATED = 'ELIMINATED',
  WITHDRAWN = 'WITHDRAWN',
}

export class TournamentParticipant {
  constructor(
    public readonly id: string,
    public readonly tournamentId: string,
    public readonly userId: string,
    public readonly eloAtSignup: number,
    public readonly registeredAt: Date,
    public status: ParticipantStatus = ParticipantStatus.REGISTERED,
    public seed: number | null = null,
    public matchWins: number = 0,
    public matchLosses: number = 0,
    public totalGamePoints: number = 0,
    public tiebreakScore: number = 0,
    public matchesPlayed: number = 0,
    public matchDraws: number = 0,
    public matchPoints: number = 0,
    public consecutiveMissed: number = 0,
    public goalsFor: number = 0,
    public goalsAgainst: number = 0,
    public goalDifference: number = 0,
  ) {}
}
