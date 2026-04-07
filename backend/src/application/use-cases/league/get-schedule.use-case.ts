import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';

@Injectable()
export class GetScheduleUseCase {
  constructor(
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository
  ) {}

  async execute(leagueId: string) {
    return this.leagueRepo.getSchedule(leagueId);
  }
}
