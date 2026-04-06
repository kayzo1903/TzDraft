import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';
import { StandingsService } from '../../../domain/league/services/standings.service';

@Injectable()
export class GetStandingsUseCase {
  constructor(
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository,
    private readonly standingsService: StandingsService,
  ) {}

  async execute(leagueId: string) {
    const participants = await this.leagueRepo.getStandings(leagueId);
    return this.standingsService.sortStandings(participants);
  }
}
