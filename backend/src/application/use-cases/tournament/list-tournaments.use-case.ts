import { Injectable, Inject } from '@nestjs/common';
import type { ITournamentRepository, TournamentFilters } from '../../../domain/tournament/repositories/tournament.repository.interface';
import { Tournament } from '../../../domain/tournament/entities/tournament.entity';

@Injectable()
export class ListTournamentsUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
  ) {}

  async execute(filters?: TournamentFilters): Promise<Tournament[]> {
    return this.repo.findAll(filters);
  }
}
