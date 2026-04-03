import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import type { IGameRepository } from '../../../domain/game/repositories/game.repository.interface';
import {
  MatchResult,
  MatchStatus,
  TournamentMatch,
} from '../../../domain/tournament/entities/tournament-match.entity';
import { ParticipantStatus } from '../../../domain/tournament/entities/tournament-participant.entity';
import { TournamentStatus } from '../../../domain/tournament/entities/tournament.entity';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import { AdvanceRoundUseCase } from './advance-round.use-case';

@Injectable()
export class AdminResolveTournamentMatchUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
    @Inject('IGameRepository')
    private readonly gameRepo: IGameRepository,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gateway: GamesGateway,
    @Inject(forwardRef(() => AdvanceRoundUseCase))
    private readonly advanceRound: AdvanceRoundUseCase,
  ) {}

  async execute(
    tournamentId: string,
    matchId: string,
    result: MatchResult.PLAYER1_WIN | MatchResult.PLAYER2_WIN,
  ): Promise<TournamentMatch> {
    const tournament = await this.repo.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.status !== TournamentStatus.ACTIVE) {
      throw new BadRequestException(
        'Manual result entry is only available for active tournaments',
      );
    }

    const match = await this.repo.findMatchById(matchId);
    if (!match || match.tournamentId !== tournamentId) {
      throw new NotFoundException('Tournament match not found');
    }

    if (
      match.status === MatchStatus.COMPLETED ||
      match.status === MatchStatus.BYE
    ) {
      throw new BadRequestException('This match is already resolved');
    }

    if (!match.player1Id || !match.player2Id) {
      throw new BadRequestException(
        'Cannot manually resolve a match without two assigned players',
      );
    }

    if (match.currentGameId) {
      const game = await this.gameRepo.findById(match.currentGameId);
      if (game && !game.isGameOver()) {
        game.abort();
        await this.gameRepo.update(game);
      }
    }

    match.currentGameId = null;
    match.status = MatchStatus.COMPLETED;
    match.result = result;
    match.completedAt = new Date();

    if (result === MatchResult.PLAYER1_WIN) {
      match.player1Wins = Math.max(match.player1Wins, 1);
    } else {
      match.player2Wins = Math.max(match.player2Wins, 1);
    }

    const savedMatch = await this.repo.updateMatch(match);

    const winnerId = savedMatch.getWinnerId();
    const loserId = savedMatch.getLoserId();

    if (winnerId) {
      const winner = await this.repo.findParticipant(tournamentId, winnerId);
      if (winner) {
        winner.matchWins += 1;
        winner.status = ParticipantStatus.ACTIVE;
        await this.repo.updateParticipant(winner);
      }
    }

    if (loserId) {
      const loser = await this.repo.findParticipant(tournamentId, loserId);
      if (loser) {
        loser.matchLosses += 1;
        loser.status = ParticipantStatus.ELIMINATED;
        await this.repo.updateParticipant(loser);
      }
    }

    this.gateway.emitTournamentMatchCompleted(
      savedMatch.player1Id!,
      savedMatch.player2Id!,
      {
        matchId: savedMatch.id,
        winnerId,
        score: 'Admin override',
        tournamentId,
        manuallyResolved: true,
      },
    );

    const allMatches = await this.repo.findMatchesByRound(savedMatch.roundId);
    const allDone = allMatches.every((roundMatch) => roundMatch.isComplete());
    if (allDone) {
      await this.advanceRound.execute(tournamentId, savedMatch.roundId);
    }

    return savedMatch;
  }
}
