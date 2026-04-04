export enum PrizeCurrency {
  TSH = 'TSH',
  USD = 'USD',
}

export class TournamentPrize {
  constructor(
    public readonly id: string,
    public readonly tournamentId: string,
    public readonly placement: number,
    public readonly amount: number,
    public readonly currency: PrizeCurrency,
    public readonly label: string | null,
  ) {}
}
