import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';

@Injectable()
export class JoinLeagueUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepo: ILeagueRepository,
  ) {}

  async execute(leagueId: string, userId: string) {
    const league = await this.leagueRepo.findLeagueById(leagueId);
    if (!league) throw new NotFoundException('League not found');

    if (!league.isRegistrationOpen()) {
      throw new BadRequestException('League registration is not open');
    }

    if (league.isFull()) {
      throw new BadRequestException('League is already full');
    }

    const existing = league.participants.find(p => p.userId === userId);
    if (existing) {
      throw new BadRequestException('User is already registered for this league');
    }

    return this.leagueRepo.addParticipant(leagueId, userId);
  }
}
