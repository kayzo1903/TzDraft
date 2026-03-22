export enum RoundStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export class TournamentRound {
  constructor(
    public readonly id: string,
    public readonly tournamentId: string,
    public readonly roundNumber: number,
    public status: RoundStatus = RoundStatus.PENDING,
    public startedAt: Date | null = null,
    public completedAt: Date | null = null,
  ) {}

  isComplete(): boolean {
    return this.status === RoundStatus.COMPLETED;
  }
}
