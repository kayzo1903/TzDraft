import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';
import { MatchResultService } from '../../../domain/league/services/match-result.service';
import { LeagueGameStatus, LeagueGameResult } from '../../../domain/league/entities/league-game.entity';
import { LeagueMatchStatus, LeagueMatchResult } from '../../../domain/league/entities/league-match.entity';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';

@Injectable()
export class ClaimForfeitUseCase {
  private readonly logger = new Logger(ClaimForfeitUseCase.name);

  constructor(
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository,
    private readonly matchResultService: MatchResultService,
    private readonly gateway: GamesGateway,
  ) {}

  /**
   * Forfeit a match. Called either:
   * - By a player manually (claimerUserId provided)
   * - By cron when deadline passed (claimerUserId = null, forfeitedPlayerId required)
   */
  async execute(
    matchId: string,
    opts: {
      claimerUserId?: string;       // Player claiming forfeit against opponent
      forfeitedPlayerId?: string;   // System-driven: who gets forfeited
    } = {},
  ): Promise<void> {
    const match = await this.leagueRepo.findMatchWithGames(matchId);
    if (!match) throw new NotFoundException(`Match ${matchId} not found`);

    if (
      match.status === LeagueMatchStatus.COMPLETED ||
      match.status === LeagueMatchStatus.FORFEITED ||
      match.status === LeagueMatchStatus.VOIDED
    ) {
      return; // Already resolved, idempotent
    }

    // Determine who forfeited
    let forfeitedBy: string;

    if (opts.forfeitedPlayerId) {
      // Cron/system driven: explicit forfeiter
      if (opts.forfeitedPlayerId !== match.player1Id && opts.forfeitedPlayerId !== match.player2Id) {
        throw new BadRequestException('forfeitedPlayerId is not a match participant');
      }
      forfeitedBy = opts.forfeitedPlayerId;
    } else if (opts.claimerUserId) {
      // Player-driven: claimer must be a participant, opponent forfeits
      if (opts.claimerUserId !== match.player1Id && opts.claimerUserId !== match.player2Id) {
        throw new BadRequestException('Not a participant in this match');
      }
      if (!match.isExpired(new Date())) {
        throw new BadRequestException('Match deadline has not passed yet');
      }
      forfeitedBy = opts.claimerUserId === match.player1Id ? match.player2Id : match.player1Id;
    } else {
      throw new BadRequestException('Must provide claimerUserId or forfeitedPlayerId');
    }

    const forfeitIsPlayer1 = forfeitedBy === match.player1Id;

    // Calculate goals:
    // - Games already completed: their results stand
    // - Games in-progress or pending: forfeiting player gets 0, opponent gets 1 per unfinished game
    let p1Goals = match.player1Goals;
    let p2Goals = match.player2Goals;
    const completedGameNumbers = match.games
      .filter((g) => g.status === LeagueGameStatus.COMPLETED)
      .map((g) => g.gameNumber);

    // Which game numbers exist in DB already
    const existingGameNumbers = match.games.map((g) => g.gameNumber);

    for (let gNum = 1; gNum <= 2; gNum++) {
      if (completedGameNumbers.includes(gNum)) continue; // Already counted in match.player1Goals/player2Goals

      // This game was not completed — forfeit it
      const { p1Add, p2Add } = this.matchResultService.getForfeitedGameGoals(
        forfeitedBy,
        match.player1Id,
      );
      p1Goals += p1Add;
      p2Goals += p2Add;

      // Mark existing in-progress game record as forfeited if it exists
      const existingGame = match.games.find((g) => g.gameNumber === gNum);
      if (existingGame && existingGame.status === LeagueGameStatus.IN_PROGRESS) {
        await this.leagueRepo.updateLeagueGame(existingGame.id, {
          status: LeagueGameStatus.FORFEITED,
          result: LeagueGameResult.PENDING,
          forfeitedBy,
          completedAt: new Date(),
        });
      }
    }

    const { result: matchResult, p1Points, p2Points } =
      this.matchResultService.computeMatchResult(p1Goals, p2Goals);

    // Save match final state
    await this.leagueRepo.updateMatch(match.id, {
      status: LeagueMatchStatus.FORFEITED,
      result: matchResult,
      player1Goals: p1Goals,
      player2Goals: p2Goals,
      forfeitedBy,
      completedAt: new Date(),
    });

    // Update participant standings
    await this.updateParticipantStats(match.leagueId, match.player1Id, p1Points, p1Goals, p2Goals);
    await this.updateParticipantStats(match.leagueId, match.player2Id, p2Points, p2Goals, p1Goals);

    // Increment consecutiveMissed for the forfeiting player
    const forfeiter = await this.leagueRepo.findParticipant(match.leagueId, forfeitedBy);
    if (forfeiter) {
      await this.leagueRepo.updateParticipant(match.leagueId, forfeitedBy, {
        consecutiveMissed: forfeiter.consecutiveMissed + 1,
      });
    }

    const standings = await this.leagueRepo.getStandings(match.leagueId);

    // Notify both players
    this.gateway.emitLeagueGameForfeited(match.player1Id, match.player2Id, {
      matchId: match.id,
      leagueId: match.leagueId,
      forfeitedBy,
      player1Goals: p1Goals,
      player2Goals: p2Goals,
      result: matchResult,
    });

    this.gateway.emitLeagueStandingsUpdated(match.leagueId, { standings });

    this.logger.log(
      `Match ${match.id} forfeited by ${forfeitedBy}: ${p1Goals}-${p2Goals} (${matchResult})`
    );
  }

  private async updateParticipantStats(
    leagueId: string,
    userId: string,
    points: number,
    goalsFor: number,
    goalsAgainst: number,
  ): Promise<void> {
    const p = await this.leagueRepo.findParticipant(leagueId, userId);
    if (!p) return;

    const isWin = points === 3;
    const isDraw = points === 1;

    await this.leagueRepo.updateParticipant(leagueId, userId, {
      matchPoints: p.matchPoints + points,
      matchWins: p.matchWins + (isWin ? 1 : 0),
      matchDraws: p.matchDraws + (isDraw ? 1 : 0),
      matchLosses: p.matchLosses + (!isWin && !isDraw ? 1 : 0),
      matchesPlayed: p.matchesPlayed + 1,
      goalsFor: p.goalsFor + goalsFor,
      goalsAgainst: p.goalsAgainst + goalsAgainst,
      goalDifference: p.goalDifference + (goalsFor - goalsAgainst),
    });
  }
}
