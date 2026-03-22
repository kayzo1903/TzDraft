import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import {
  Tournament,
  TournamentFormat,
  TournamentStyle,
  TournamentStatus,
  TournamentScope,
  FORMAT_MAX_PLAYERS,
} from '../../../domain/tournament/entities/tournament.entity';

export interface CreateTournamentDto {
  name: string;
  descriptionEn: string;
  descriptionSw: string;
  rulesEn?: string;
  rulesSw?: string;
  format: TournamentFormat;
  style: TournamentStyle;
  scope?: TournamentScope;
  country?: string;
  region?: string;
  maxPlayers: number;
  minPlayers?: number;
  scheduledStartAt: Date;
  registrationDeadline?: Date;
  createdById: string;
  minElo?: number;
  maxElo?: number;
  minMatchmakingWins?: number;
  minAiLevelBeaten?: number;
  requiredAiLevelPlayed?: number;
}

@Injectable()
export class CreateTournamentUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
  ) {}

  async execute(dto: CreateTournamentDto): Promise<Tournament> {
    if (dto.format !== TournamentFormat.SINGLE_ELIMINATION) {
      throw new BadRequestException(
        `Phase 1 currently supports only ${TournamentFormat.SINGLE_ELIMINATION}`,
      );
    }

    const cap = FORMAT_MAX_PLAYERS[dto.format];
    if (dto.maxPlayers > cap) {
      throw new BadRequestException(
        `maxPlayers ${dto.maxPlayers} exceeds the hard cap of ${cap} for ${dto.format}`,
      );
    }

    const tournament = new Tournament(
      randomUUID(),
      dto.name,
      dto.descriptionEn,
      dto.descriptionSw,
      dto.format,
      dto.style,
      TournamentStatus.REGISTRATION,
      dto.scope ?? TournamentScope.GLOBAL,
      dto.maxPlayers,
      dto.minPlayers ?? 4,
      dto.scheduledStartAt,
      dto.createdById,
      new Date(),
      dto.country ?? null,
      dto.region ?? null,
      dto.rulesEn ?? null,
      dto.rulesSw ?? null,
      dto.minElo ?? null,
      dto.maxElo ?? null,
      dto.minMatchmakingWins ?? null,
      dto.minAiLevelBeaten ?? null,
      dto.requiredAiLevelPlayed ?? null,
      dto.registrationDeadline ?? null,
    );

    return this.repo.create(tournament);
  }
}
