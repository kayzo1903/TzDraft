import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import { TournamentStatus } from '../../../domain/tournament/entities/tournament.entity';

@Injectable()
export class AdminCancelTournamentUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
  ) {}

  async execute(tournamentId: string) {
    const tournament = await this.repo.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (
      tournament.status !== TournamentStatus.DRAFT &&
      tournament.status !== TournamentStatus.REGISTRATION
    ) {
      throw new BadRequestException('Only tournaments that have not started can be cancelled');
    }

    tournament.status = TournamentStatus.CANCELLED;
    return this.repo.update(tournament);
  }
}
