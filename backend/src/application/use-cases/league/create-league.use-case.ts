import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';

@Injectable()
export class CreateLeagueUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepo: ILeagueRepository,
  ) {}

  async execute(name: string, roundDurationDays: number, createdById: string) {
    if (roundDurationDays < 1) {
      throw new BadRequestException('Round duration must be at least 1 day.');
    }
    return this.leagueRepo.createLeague(name, 12, roundDurationDays, createdById);
  }
}
