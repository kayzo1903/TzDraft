import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import { TournamentStatus } from '../../../domain/tournament/entities/tournament.entity';

@Injectable()
export class AdminDeleteTournamentUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const tournament = await this.repo.findById(id);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    if (tournament.status === TournamentStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot delete an active tournament. Cancel it first.',
      );
    }
    await this.repo.deleteTournament(id);
  }
}
