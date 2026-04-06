import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';
import { MatchResultService } from '../../../domain/league/services/match-result.service';
import { LeagueGameStatus, LeagueGameResult } from '../../../domain/league/entities/league-game.entity';
import { LeagueMatchStatus } from '../../../domain/league/entities/league-match.entity';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';

@Injectable()
export class HandleGameCompletedUseCase {
  private readonly logger = new Logger(HandleGameCompletedUseCase.name);

  constructor(
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository,
    private readonly matchResultService: MatchResultService,
    private readonly gateway: GamesGateway,
  ) {}

  /**
   * Called when a Game entity finishes (via MakeMoveUseCase or EndGameUseCase).
   * @param leagueGameId  The LeagueGame tracking record ID
   * @param winnerColor   Result of the underlying game
   */
  async execute(leagueGameId: string, winnerColor: 'WHITE' | 'BLACK' | 'DRAW'): Promise<void> {
    const game = await this.leagueRepo.findGameById(leagueGameId);
    if (!game) throw new NotFoundException(`LeagueGame ${leagueGameId} not found`);

    const match = await this.leagueRepo.findMatchWithGames(game.matchId);
    if (!match) throw new NotFoundException(`Match ${game.matchId} not found`);

    // Map winner color to game result enum
    const result: LeagueGameResult =
      winnerColor === 'WHITE' ? LeagueGameResult.WHITE_WIN :
      winnerColor === 'BLACK' ? LeagueGameResult.BLACK_WIN :
      LeagueGameResult.DRAW;

    // Goals: 1 for win, 0.5 for draw, 0 for loss
    const whiteGoals = winnerColor === 'WHITE' ? 1 : winnerColor === 'DRAW' ? 0.5 : 0;
    const blackGoals = winnerColor === 'BLACK' ? 1 : winnerColor === 'DRAW' ? 0.5 : 0;

    // Who is player1 and player2 in match context?
    const whiteIsPlayer1 = game.whitePlayerId === match.player1Id;
    const p1GoalsFromGame = whiteIsPlayer1 ? whiteGoals : blackGoals;
    const p2GoalsFromGame = whiteIsPlayer1 ? blackGoals : whiteGoals;

    // Mark game completed
    await this.leagueRepo.updateLeagueGame(game.id, {
      status: LeagueGameStatus.COMPLETED,
      result,
      completedAt: new Date(),
    });

    this.logger.log(`LeagueGame ${leagueGameId} completed: ${result} (Match ${match.id}, Game ${game.gameNumber})`);

    if (game.gameNumber === 1) {
      // Update match goals so far and move to IN_PROGRESS
      const newP1Goals = match.player1Goals + p1GoalsFromGame;
      const newP2Goals = match.player2Goals + p2GoalsFromGame;

      await this.leagueRepo.updateMatch(match.id, {
        status: LeagueMatchStatus.IN_PROGRESS,
        player1Goals: newP1Goals,
        player2Goals: newP2Goals,
      });

      // Notify both players that Game 2 is ready to start
      this.gateway.emitLeagueGame2Ready(match.player1Id, match.player2Id, {
        matchId: match.id,
        leagueId: match.leagueId,
        player1Goals: newP1Goals,
        player2Goals: newP2Goals,
        game1Result: result,
      });

      this.logger.log(`Match ${match.id}: Game 1 done (${newP1Goals}-${newP2Goals}), Game 2 ready`);

    } else {
      // Game 2 done — finalize match
      const finalP1Goals = match.player1Goals + p1GoalsFromGame;
      const finalP2Goals = match.player2Goals + p2GoalsFromGame;

      const { result: matchResult, p1Points, p2Points } =
        this.matchResultService.computeMatchResult(finalP1Goals, finalP2Goals);

      await this.leagueRepo.updateMatch(match.id, {
        status: LeagueMatchStatus.COMPLETED,
        result: matchResult,
        player1Goals: finalP1Goals,
        player2Goals: finalP2Goals,
        completedAt: new Date(),
      });

      // Update participant standings for both players
      await this.updateParticipantStats(
        match.leagueId, match.player1Id,
        p1Points, finalP1Goals, finalP2Goals,
      );
      await this.updateParticipantStats(
        match.leagueId, match.player2Id,
        p2Points, finalP2Goals, finalP1Goals,
      );

      const standings = await this.leagueRepo.getStandings(match.leagueId);

      // Notify players match is done
      this.gateway.emitLeagueMatchCompleted(match.player1Id, match.player2Id, {
        matchId: match.id,
        leagueId: match.leagueId,
        player1Goals: finalP1Goals,
        player2Goals: finalP2Goals,
        result: matchResult,
        p1Points,
        p2Points,
      });

      // Broadcast updated standings to league room
      this.gateway.emitLeagueStandingsUpdated(match.leagueId, { standings });

      this.logger.log(
        `Match ${match.id} completed: ${finalP1Goals}-${finalP2Goals} (${matchResult}). ` +
        `P1 +${p1Points}pts, P2 +${p2Points}pts`
      );
    }
  }

  private async updateParticipantStats(
    leagueId: string,
    userId: string,
    points: number,
    goalsFor: number,
    goalsAgainst: number,
  ): Promise<void> {
    const participant = await this.leagueRepo.findParticipant(leagueId, userId);
    if (!participant) return;

    const isWin = points === 3;
    const isDraw = points === 1;

    await this.leagueRepo.updateParticipant(leagueId, userId, {
      matchPoints: participant.matchPoints + points,
      matchWins: participant.matchWins + (isWin ? 1 : 0),
      matchDraws: participant.matchDraws + (isDraw ? 1 : 0),
      matchLosses: participant.matchLosses + (!isWin && !isDraw ? 1 : 0),
      matchesPlayed: participant.matchesPlayed + 1,
      goalsFor: participant.goalsFor + goalsFor,
      goalsAgainst: participant.goalsAgainst + goalsAgainst,
      goalDifference: participant.goalDifference + (goalsFor - goalsAgainst),
      consecutiveMissed: 0, // Reset on activity
    });
  }
}
