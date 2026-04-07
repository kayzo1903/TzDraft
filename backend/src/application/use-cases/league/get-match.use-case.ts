import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';

@Injectable()
export class GetMatchUseCase {
  constructor(
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository
  ) {}

  async execute(matchId: string) {
    const match = await this.leagueRepo.findMatchWithGames(matchId);
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }
}
