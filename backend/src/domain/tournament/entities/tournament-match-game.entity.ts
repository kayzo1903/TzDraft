import { MatchGameResult } from './tournament-match.entity';

export class TournamentMatchGame {
  constructor(
    public readonly id: string,
    public readonly matchId: string,
    public readonly gameNumber: number,
    public readonly isExtra: boolean = false,
    public result: MatchGameResult | null = null,
  ) {}
}
