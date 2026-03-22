import { Injectable, Inject, forwardRef } from '@nestjs/common';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import { MatchProgressionService } from '../../../domain/tournament/services/match-progression.service';
import { MatchGameResult, MatchStatus } from '../../../domain/tournament/entities/tournament-match.entity';
import { ParticipantStatus } from '../../../domain/tournament/entities/tournament-participant.entity';
import { RoundStatus } from '../../../domain/tournament/entities/tournament-round.entity';
import { Tournament } from '../../../domain/tournament/entities/tournament.entity';
import { TournamentMatch } from '../../../domain/tournament/entities/tournament-match.entity';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import { StartTournamentUseCase } from './start-tournament.use-case';
import { AdvanceRoundUseCase } from './advance-round.use-case';
import { Winner } from '../../../shared/constants/game.constants';

@Injectable()
export class ReportTournamentResultUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
    private readonly progression: MatchProgressionService,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gateway: GamesGateway,
    @Inject(forwardRef(() => StartTournamentUseCase))
    private readonly startUseCase: StartTournamentUseCase,
    @Inject(forwardRef(() => AdvanceRoundUseCase))
    private readonly advanceRound: AdvanceRoundUseCase,
  ) {}

  /**
   * Called after any game ends. If the game belongs to a tournament match,
   * applies match progression logic and spawns the next game or ends the match.
   */
  async execute(
    gameId: string,
    winner: Winner | null,
    whitePlayerId: string,
    blackPlayerId: string | null,
  ): Promise<void> {
    const match = await this.repo.findMatchByCurrentGameId(gameId);
    if (!match) return; // not a tournament game

    const tournament = await this.repo.findById(match.tournamentId);
    if (!tournament) return;

    // Determine game result relative to match.player1Id
    const gameResult = this.deriveGameResult(match, winner, whitePlayerId);

    // Find the TournamentMatchGame for this game
    const allMatchGames = await this.repo.findMatchGamesByMatch(match.id);
    const currentMatchGame = allMatchGames.find(
      (mg) => mg.gameNumber === match.gamesPlayed + 1,
    );

    // Null out active game pointer and increment gamesPlayed
    match.currentGameId = null;

    // Decide what happens next
    const decision = this.progression.decide(match, gameResult);

    // Apply the result counters back to the match
    const updated = this.progression.applyResult(match, gameResult);
    Object.assign(match, {
      gamesPlayed: updated.gamesPlayed,
      player1Wins: updated.player1Wins,
      player2Wins: updated.player2Wins,
      player1ConsecLoss: updated.player1ConsecLoss,
      player2ConsecLoss: updated.player2ConsecLoss,
    });

    // Update the TournamentMatchGame result
    if (currentMatchGame) {
      currentMatchGame.result = gameResult;
      await this.repo.updateMatchGame(currentMatchGame);
    }

    if (decision.action === 'SPAWN_NEXT') {
      await this.repo.updateMatch(match);
      await this.startUseCase.spawnGameForMatch(
        match,
        tournament,
        decision.gameNumber,
        match.player1Id!,
        match.player2Id!,
      );
      return;
    }

    // END_MATCH
    match.status = MatchStatus.COMPLETED;
    match.result = decision.result;
    match.completedAt = new Date();
    await this.repo.updateMatch(match);

    // Update participant stats
    const winner_ = decision.winnerId;
    const loser = decision.loserId;

    if (winner_) {
      const wp = await this.repo.findParticipant(match.tournamentId, winner_);
      if (wp) {
        wp.matchWins += 1;
        wp.status = ParticipantStatus.ACTIVE;
        await this.repo.updateParticipant(wp);
      }
    }
    if (loser) {
      const lp = await this.repo.findParticipant(match.tournamentId, loser);
      if (lp) {
        lp.matchLosses += 1;
        lp.status = ParticipantStatus.ELIMINATED;
        await this.repo.updateParticipant(lp);
      }
    }

    // Emit match complete
    this.gateway.emitTournamentMatchCompleted(match.player1Id!, match.player2Id!, {
      matchId: match.id,
      winnerId: decision.winnerId,
      score: decision.score,
      tournamentId: match.tournamentId,
    });

    // Check if whole round is complete
    const allMatches = await this.repo.findMatchesByRound(match.roundId);
    const allDone = allMatches.every((m) => m.isComplete());
    if (allDone) {
      await this.advanceRound.execute(match.tournamentId, match.roundId);
    }
  }

  private deriveGameResult(
    match: TournamentMatch,
    winner: Winner | null,
    whitePlayerId: string,
  ): MatchGameResult {
    if (!winner || winner === Winner.DRAW) return MatchGameResult.DRAW;

    const whiteIsPlayer1 = match.player1Id === whitePlayerId;
    if (winner === Winner.WHITE) {
      return whiteIsPlayer1 ? MatchGameResult.PLAYER1_WIN : MatchGameResult.PLAYER2_WIN;
    }
    // Winner.BLACK
    return whiteIsPlayer1 ? MatchGameResult.PLAYER2_WIN : MatchGameResult.PLAYER1_WIN;
  }
}
