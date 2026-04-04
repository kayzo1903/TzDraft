import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import { Tournament } from '../../../domain/tournament/entities/tournament.entity';

@Injectable()
export class AdminSetTournamentVisibilityUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
  ) {}

  async execute(id: string, hidden: boolean): Promise<Tournament> {
    const tournament = await this.repo.findById(id);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    return this.repo.setHidden(id, hidden);
  }
}
