import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import { ParticipantStatus } from '../../../domain/tournament/entities/tournament-participant.entity';

@Injectable()
export class AdminRemoveTournamentParticipantUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
  ) {}

  async execute(tournamentId: string, userId: string): Promise<void> {
    const tournament = await this.repo.findById(tournamentId);
    if (!tournament) throw new NotFoundException('Tournament not found');

    if (!tournament.isRegistrationOpen()) {
      throw new BadRequestException(
        'Players can only be removed before the tournament starts',
      );
    }

    const participant = await this.repo.findParticipant(tournamentId, userId);
    if (!participant) {
      throw new NotFoundException('Participant not found in this tournament');
    }

    if (participant.status === ParticipantStatus.WITHDRAWN) {
      throw new BadRequestException('Participant is already withdrawn');
    }

    await this.repo.deleteParticipant(tournamentId, userId);
  }
}
