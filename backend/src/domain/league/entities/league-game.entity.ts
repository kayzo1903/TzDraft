export enum LeagueGameStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FORFEITED = 'FORFEITED',
}

export enum LeagueGameResult {
  WHITE_WIN = 'WHITE_WIN',
  BLACK_WIN = 'BLACK_WIN',
  DRAW = 'DRAW',
  PENDING = 'PENDING',
}

export class LeagueGame {
  constructor(
    public readonly id: string,
    public readonly matchId: string,
    public readonly leagueId: string,
    public readonly gameNumber: number,
    public readonly whitePlayerId: string,
    public readonly blackPlayerId: string,
    public status: LeagueGameStatus,
    public result: LeagueGameResult,
    public forfeitedBy: string | null = null,
    public completedAt: Date | null = null,
  ) {}
}
