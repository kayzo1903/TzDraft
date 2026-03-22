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
  ) {}
}
