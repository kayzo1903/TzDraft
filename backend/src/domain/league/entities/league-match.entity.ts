import { LeagueGame } from './league-game.entity';

export enum LeagueMatchStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FORFEITED = 'FORFEITED',
  VOIDED = 'VOIDED',
}

export enum LeagueMatchResult {
  PLAYER1_WIN = 'PLAYER1_WIN',
  PLAYER2_WIN = 'PLAYER2_WIN',
  DRAW = 'DRAW',
  PENDING = 'PENDING',
}

export class LeagueMatch {
  constructor(
    public readonly id: string,
    public readonly leagueId: string,
    public readonly roundId: string,
    public readonly player1Id: string,
    public readonly player2Id: string,
    public status: LeagueMatchStatus,
    public result: LeagueMatchResult,
    public player1Goals: number,
    public player2Goals: number,
    public deadline: Date | null = null,
    public forfeitedBy: string | null = null,
    public voidReason: string | null = null,
    public completedAt: Date | null = null,
    public games: LeagueGame[] = [],
  ) {}

  isExpired(now: Date): boolean {
    if (this.status === LeagueMatchStatus.COMPLETED || this.status === LeagueMatchStatus.FORFEITED || this.status === LeagueMatchStatus.VOIDED) {
      return false;
    }
    return this.deadline !== null && this.deadline < now;
  }
}
