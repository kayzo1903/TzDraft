import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';
import { ScheduleGenerationService } from '../../../domain/league/services/schedule-generation.service';
import { LeagueStatus } from '../../../domain/league/entities/league.entity';
import { LeagueRound, LeagueRoundStatus } from '../../../domain/league/entities/league-round.entity';
import { LeagueMatch, LeagueMatchStatus, LeagueMatchResult } from '../../../domain/league/entities/league-match.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class StartLeagueUseCase {
  constructor(
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository,
    private readonly scheduleGen: ScheduleGenerationService,
  ) {}

  async execute(leagueId: string) {
    const league = await this.leagueRepo.findLeagueById(leagueId);
    if (!league) throw new NotFoundException('League not found');

    if (!league.canStart()) {
      throw new BadRequestException('League must be in REGISTRATION status and have exactly 12 players to start.');
    }

    const playerIds = league.participants.map(p => p.userId);
    const stubs = this.scheduleGen.generateSchedule(playerIds);

    const now = new Date();
    const roundsMap = new Map<number, LeagueRound>();
    const matches: LeagueMatch[] = [];

    // Create 11 rounds
    for (let i = 1; i <= 11; i++) {
        const deadline = new Date(now.getTime() + (i * league.roundDurationDays * 24 * 60 * 60 * 1000));
        roundsMap.set(i, new LeagueRound(randomUUID(), leagueId, i, i === 1 ? LeagueRoundStatus.ACTIVE : LeagueRoundStatus.PENDING, deadline));
    }

    // Assign matches to rounds
    for (const stub of stubs) {
      const round = roundsMap.get(stub.roundNumber)!;
      matches.push(new LeagueMatch(
        randomUUID(), leagueId, round.id, stub.player1Id, stub.player2Id,
        LeagueMatchStatus.SCHEDULED, LeagueMatchResult.PENDING, 0, 0, round.deadline
      ));
    }

    await this.leagueRepo.saveSchedule(leagueId, Array.from(roundsMap.values()), matches);
    await this.leagueRepo.updateLeague(leagueId, { status: LeagueStatus.ACTIVE, currentRound: 1, startDate: now });
  }
}
