export enum MatchStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  BYE = 'BYE',
}

export enum MatchResult {
  PLAYER1_WIN = 'PLAYER1_WIN',
  PLAYER2_WIN = 'PLAYER2_WIN',
  BYE = 'BYE',
}

export enum MatchGameResult {
  PLAYER1_WIN = 'PLAYER1_WIN',
  PLAYER2_WIN = 'PLAYER2_WIN',
  DRAW = 'DRAW',
}

export class TournamentMatch {
  constructor(
    public readonly id: string,
    public readonly roundId: string,
    public readonly tournamentId: string,
    public status: MatchStatus = MatchStatus.PENDING,
    public result: MatchResult | null = null,
    public player1Id: string | null = null,
    public player2Id: string | null = null,
    public player1Wins: number = 0,
    public player2Wins: number = 0,
    public player1ConsecLoss: number = 0,
    public player2ConsecLoss: number = 0,
    public gamesPlayed: number = 0,
    public player1GamePoints: number = 0,
    public player2GamePoints: number = 0,
    public currentGameId: string | null = null,
    public startedAt: Date | null = null,
    public completedAt: Date | null = null,
  ) {}

  isComplete(): boolean {
    return this.status === MatchStatus.COMPLETED || this.status === MatchStatus.BYE;
  }

  getWinnerId(): string | null {
    if (!this.result) return null;
    if (this.result === MatchResult.PLAYER1_WIN || this.result === MatchResult.BYE) {
      return this.player1Id;
    }
    return this.player2Id;
  }

  getLoserId(): string | null {
    if (!this.result || this.result === MatchResult.BYE) return null;
    if (this.result === MatchResult.PLAYER1_WIN) return this.player2Id;
    return this.player1Id;
  }
}
