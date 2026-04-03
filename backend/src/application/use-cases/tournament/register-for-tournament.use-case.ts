import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import { TournamentParticipant } from '../../../domain/tournament/entities/tournament-participant.entity';
import { EligibilityCheckService } from '../../../domain/tournament/services/eligibility-check.service';
import { TournamentNotificationService } from '../../services/tournament-notification.service';

@Injectable()
export class RegisterForTournamentUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
    private readonly eligibility: EligibilityCheckService,
    private readonly prisma: PrismaService,
    private readonly notificationService: TournamentNotificationService,
  ) {}

  async execute(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentParticipant> {
    const tournament = await this.repo.findById(tournamentId);
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (!tournament.isRegistrationOpen()) {
      throw new BadRequestException('Tournament registration is not open');
    }

    const count = await this.repo.countParticipants(tournamentId);
    if (tournament.isFull(count)) {
      throw new BadRequestException('Tournament is full');
    }

    const existing = await this.repo.findParticipant(tournamentId, userId);
    if (existing) throw new BadRequestException('Already registered');

    // Load user + rating
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { rating: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const rating = user.rating as any;
    const elo = rating?.rating ?? 1200;
    const matchmakingWins = rating?.matchmakingWins ?? 0;
    const highestAiLevelBeaten = rating?.highestAiLevelBeaten ?? null;
    const highestAiLevelPlayed = rating?.highestAiLevelPlayed ?? 0;

    const result = this.eligibility.check(tournament, {
      country: user.country,
      region: user.region,
      elo,
      matchmakingWins,
      highestAiLevelBeaten,
      highestAiLevelPlayed,
    });

    if (!result.eligible) {
      throw new UnprocessableEntityException({
        message: 'Eligibility requirements not met',
        checks: result.checks,
      });
    }

    const participant = new TournamentParticipant(
      randomUUID(),
      tournamentId,
      userId,
      elo,
      new Date(),
    );

    const saved = await this.repo.createParticipant(participant);

    void this.notificationService.notifyRegistered(userId, tournament);

    return saved;
  }
}
