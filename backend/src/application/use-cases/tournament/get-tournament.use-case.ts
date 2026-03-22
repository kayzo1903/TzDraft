import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import { Tournament } from '../../../domain/tournament/entities/tournament.entity';
import { TournamentParticipant } from '../../../domain/tournament/entities/tournament-participant.entity';
import { TournamentRound } from '../../../domain/tournament/entities/tournament-round.entity';
import { TournamentMatch } from '../../../domain/tournament/entities/tournament-match.entity';

export interface TournamentDetail {
  tournament: Tournament;
  participants: TournamentParticipant[];
  rounds: TournamentRound[];
  matches: TournamentMatch[];
}

@Injectable()
export class GetTournamentUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
  ) {}

  async execute(id: string): Promise<TournamentDetail> {
    const tournament = await this.repo.findById(id);
    if (!tournament) throw new NotFoundException('Tournament not found');

    const [participants, rounds, matches] = await Promise.all([
      this.repo.findParticipantsByTournament(id),
      this.repo.findRoundsByTournament(id),
      this.repo.findMatchesByTournament(id),
    ]);

    return { tournament, participants, rounds, matches };
  }
}
