import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';

@Injectable()
export class WithdrawFromTournamentUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
  ) {}

  async execute(tournamentId: string, userId: string): Promise<void> {
    const tournament = await this.repo.findById(tournamentId);
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (!tournament.isRegistrationOpen()) {
      throw new BadRequestException(
        'Cannot withdraw after registration closes',
      );
    }

    const participant = await this.repo.findParticipant(tournamentId, userId);
    if (!participant)
      throw new NotFoundException('Not registered in this tournament');

    await this.repo.deleteParticipant(tournamentId, userId);
  }
}
