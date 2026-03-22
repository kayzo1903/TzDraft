import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import {
  FORMAT_MAX_PLAYERS,
  TournamentScope,
  TournamentStatus,
  TournamentStyle,
} from '../../../domain/tournament/entities/tournament.entity';

export interface AdminUpdateTournamentDto {
  name?: string;
  descriptionEn?: string;
  descriptionSw?: string;
  rulesEn?: string | null;
  rulesSw?: string | null;
  style?: TournamentStyle;
  scope?: TournamentScope;
  country?: string | null;
  region?: string | null;
  maxPlayers?: number;
  minPlayers?: number;
  scheduledStartAt?: Date;
  registrationDeadline?: Date | null;
}

@Injectable()
export class AdminUpdateTournamentUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
  ) {}

  async execute(tournamentId: string, dto: AdminUpdateTournamentDto) {
    const tournament = await this.repo.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.status !== TournamentStatus.REGISTRATION) {
      throw new BadRequestException('Tournament details can only be edited before the tournament starts');
    }

    const name = dto.name?.trim() ?? tournament.name;
    const descriptionEn = dto.descriptionEn?.trim() ?? tournament.descriptionEn;
    const descriptionSw = dto.descriptionSw?.trim() ?? tournament.descriptionSw;
    const rulesEn = dto.rulesEn === undefined ? tournament.rulesEn : dto.rulesEn?.trim() || null;
    const rulesSw = dto.rulesSw === undefined ? tournament.rulesSw : dto.rulesSw?.trim() || null;
    const style = dto.style ?? tournament.style;
    const scope = dto.scope ?? tournament.scope;
    const country = dto.country === undefined ? tournament.country : dto.country?.trim() || null;
    const region = dto.region === undefined ? tournament.region : dto.region?.trim() || null;
    const maxPlayers = dto.maxPlayers ?? tournament.maxPlayers;
    const minPlayers = dto.minPlayers ?? tournament.minPlayers;
    const scheduledStartAt = dto.scheduledStartAt ?? tournament.scheduledStartAt;
    const registrationDeadline =
      dto.registrationDeadline === undefined
        ? tournament.registrationDeadline
        : dto.registrationDeadline;

    if (name.length < 3) {
      throw new BadRequestException('Tournament name must be at least 3 characters');
    }

    if (descriptionEn.length < 10 || descriptionSw.length < 10) {
      throw new BadRequestException('Tournament descriptions must be at least 10 characters');
    }

    const cap = FORMAT_MAX_PLAYERS[tournament.format];
    if (maxPlayers > cap) {
      throw new BadRequestException(
        `maxPlayers ${maxPlayers} exceeds the hard cap of ${cap} for ${tournament.format}`,
      );
    }

    if (minPlayers > maxPlayers) {
      throw new BadRequestException('Minimum players cannot exceed maximum players');
    }

    const participantCount = await this.repo.countParticipants(tournament.id);
    if (maxPlayers < participantCount) {
      throw new BadRequestException('Maximum players cannot be lower than the current number of registered players');
    }

    const now = new Date();
    if (scheduledStartAt <= now) {
      throw new BadRequestException('Scheduled start time must be in the future');
    }

    if (registrationDeadline && registrationDeadline <= now) {
      throw new BadRequestException('Registration deadline must be in the future');
    }

    if (registrationDeadline && registrationDeadline >= scheduledStartAt) {
      throw new BadRequestException('Registration deadline must be before the scheduled start time');
    }

    if (scope === TournamentScope.COUNTRY && !country) {
      throw new BadRequestException('Country is required for country tournaments');
    }

    if (scope === TournamentScope.REGION && (!country || !region)) {
      throw new BadRequestException('Country and region are required for regional tournaments');
    }

    return this.repo.updateDetails(tournament.id, {
      name,
      descriptionEn,
      descriptionSw,
      rulesEn,
      rulesSw,
      style,
      scope,
      country: scope === TournamentScope.GLOBAL ? null : country,
      region: scope === TournamentScope.REGION ? region : null,
      maxPlayers,
      minPlayers,
      scheduledStartAt,
      registrationDeadline: registrationDeadline ?? null,
    });
  }
}
