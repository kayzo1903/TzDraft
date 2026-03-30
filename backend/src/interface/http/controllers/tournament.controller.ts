import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import { CreateTournamentUseCase } from '../../../application/use-cases/tournament/create-tournament.use-case';
import { RegisterForTournamentUseCase } from '../../../application/use-cases/tournament/register-for-tournament.use-case';
import { WithdrawFromTournamentUseCase } from '../../../application/use-cases/tournament/withdraw-from-tournament.use-case';
import { StartTournamentUseCase } from '../../../application/use-cases/tournament/start-tournament.use-case';
import { ListTournamentsUseCase } from '../../../application/use-cases/tournament/list-tournaments.use-case';
import { GetTournamentUseCase } from '../../../application/use-cases/tournament/get-tournament.use-case';
import { AdminRemoveTournamentParticipantUseCase } from '../../../application/use-cases/tournament/admin-remove-tournament-participant.use-case';
import {
  CreateTournamentDto,
  ListTournamentsQueryDto,
  UpdateTournamentDto,
  AdminResolveTournamentMatchDto,
} from '../dtos/tournament.dto';
import { AdminUpdateTournamentUseCase } from '../../../application/use-cases/tournament/admin-update-tournament.use-case';
import { AdminResolveTournamentMatchUseCase } from '../../../application/use-cases/tournament/admin-resolve-tournament-match.use-case';
import { AdminCancelTournamentUseCase } from '../../../application/use-cases/tournament/admin-cancel-tournament.use-case';
import { TournamentFormat, TournamentScope } from '../../../domain/tournament/entities/tournament.entity';
import { TournamentStatus } from '../../../domain/tournament/entities/tournament.entity';

@Controller('tournaments')
export class TournamentController {
  constructor(
    private readonly createTournament: CreateTournamentUseCase,
    private readonly registerFor: RegisterForTournamentUseCase,
    private readonly withdrawFrom: WithdrawFromTournamentUseCase,
    private readonly startTournament: StartTournamentUseCase,
    private readonly listTournaments: ListTournamentsUseCase,
    private readonly getTournament: GetTournamentUseCase,
    private readonly adminRemoveParticipant: AdminRemoveTournamentParticipantUseCase,
    private readonly adminUpdateTournament: AdminUpdateTournamentUseCase,
    private readonly adminCancelTournament: AdminCancelTournamentUseCase,
    private readonly adminResolveMatch: AdminResolveTournamentMatchUseCase,
  ) {}

  @Get()
  @Public()
  async list(@Query() query: ListTournamentsQueryDto) {
    return this.listTournaments.execute({
      status: query.status,
      format: query.format as TournamentFormat | undefined,
      scope: query.scope as TournamentScope | undefined,
      country: query.country,
      region: query.region,
    });
  }

  @Get(':id')
  @Public()
  async get(@Param('id') id: string) {
    return this.getTournament.execute(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTournamentDto, @CurrentUser() user: { id: string }) {
    return this.createTournament.execute({
      ...dto,
      scheduledStartAt: new Date(dto.scheduledStartAt),
      registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : undefined,
      createdById: user.id,
    });
  }

  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  async register(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.registerFor.execute(id, user.id);
  }

  @Delete(':id/register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdraw(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.withdrawFrom.execute(id, user.id);
  }

  @Post(':id/start')
  @UseGuards(AdminGuard)
  async start(@Param('id') id: string) {
    return this.startTournament.execute(id);
  }

  @Post(':id/cancel')
  @UseGuards(AdminGuard)
  async cancel(@Param('id') id: string) {
    return this.adminCancelTournament.execute(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateTournamentDto) {
    return this.adminUpdateTournament.execute(id, {
      name: dto.name,
      descriptionEn: dto.descriptionEn,
      descriptionSw: dto.descriptionSw,
      rulesEn: dto.rulesEn,
      rulesSw: dto.rulesSw,
      style: dto.style,
      scope: dto.scope,
      country: dto.country,
      region: dto.region,
      maxPlayers: dto.maxPlayers,
      minPlayers: dto.minPlayers,
      scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : undefined,
      registrationDeadline:
        dto.registrationDeadline === undefined
          ? undefined
          : dto.registrationDeadline
            ? new Date(dto.registrationDeadline)
            : null,
    });
  }

  @Delete(':id/participants/:userId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminRemove(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.adminRemoveParticipant.execute(id, userId);
  }

  @Post(':id/matches/:matchId/manual-result')
  @UseGuards(AdminGuard)
  async manualResult(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body() dto: AdminResolveTournamentMatchDto,
  ) {
    return this.adminResolveMatch.execute(id, matchId, dto.result);
  }
}
