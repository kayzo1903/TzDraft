import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';
import { LeagueParticipantStatus } from '../../../domain/league/entities/league-participant.entity';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';

/** Min matches played to trigger forfeit-remaining instead of full expunge */
const EXPUNGE_THRESHOLD = 6;
/** Consecutive missed match deadlines before marking INACTIVE */
const INACTIVE_THRESHOLD = 2;

@Injectable()
export class HandlePlayerInactiveUseCase {
  private readonly logger = new Logger(HandlePlayerInactiveUseCase.name);

  constructor(
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository,
    private readonly gateway: GamesGateway,
  ) {}

  /**
   * Run for one league. Called by the inactivity cron sweep.
   * 1. Flags players with consecutiveMissed >= 2 as INACTIVE
   * 2. Applies 50% threshold rule:
   *    - < 6 matches played → expunge (void all results, remove from table)
   *    - >= 6 matches played → forfeit all remaining scheduled matches
   */
  async execute(leagueId: string): Promise<void> {
    const participants = await this.leagueRepo.getParticipants(leagueId);

    for (const participant of participants) {
      if (participant.status !== LeagueParticipantStatus.ACTIVE) continue;
      if (participant.consecutiveMissed < INACTIVE_THRESHOLD) continue;

      // Mark INACTIVE
      await this.leagueRepo.updateParticipant(leagueId, participant.userId, {
        status: LeagueParticipantStatus.INACTIVE,
      });

      this.logger.warn(
        `Player ${participant.userId} in league ${leagueId} marked INACTIVE ` +
        `(${participant.consecutiveMissed} consecutive missed deadlines, ` +
        `${participant.matchesPlayed} matches played)`
      );

      if (participant.matchesPlayed < EXPUNGE_THRESHOLD) {
        // EXPUNGE — void all results, remove from standings
        await this.leagueRepo.voidMatchesByPlayer(leagueId, participant.userId);

        const standings = await this.leagueRepo.getStandings(leagueId);
        this.gateway.emitLeagueStandingsUpdated(leagueId, { standings });

        this.logger.warn(
          `Player ${participant.userId} EXPELLED from league ${leagueId} ` +
          `(only ${participant.matchesPlayed} matches played — below threshold of ${EXPUNGE_THRESHOLD}). ` +
          `All results voided.`
        );
      } else {
        // FORFEIT REMAINING — completed results stand, forfeit the rest
        const forfeited = await this.leagueRepo.forfeitRemainingMatchesByPlayer(
          leagueId,
          participant.userId,
        );

        const standings = await this.leagueRepo.getStandings(leagueId);
        this.gateway.emitLeagueStandingsUpdated(leagueId, { standings });

        this.logger.warn(
          `Player ${participant.userId} forfeited ${forfeited.length} remaining matches in league ${leagueId} ` +
          `(${participant.matchesPlayed} matches played — above threshold of ${EXPUNGE_THRESHOLD}). ` +
          `Completed results stand.`
        );
      }
    }
  }
}
