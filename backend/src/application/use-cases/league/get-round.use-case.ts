import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';

@Injectable()
export class GetRoundUseCase {
  constructor(
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository
  ) {}

  async execute(leagueId: string, roundNumber: number) {
    const round = await this.leagueRepo.findRound(leagueId, roundNumber);
    if (!round) throw new NotFoundException('Round not found');
    return round;
  }
}
