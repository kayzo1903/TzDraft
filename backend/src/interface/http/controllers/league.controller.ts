import {
  Controller, Post, Get, Patch, Param, Body,
  UseGuards, Request, Inject, HttpCode, HttpStatus, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CreateLeagueUseCase } from '../../../application/use-cases/league/create-league.use-case';
import { JoinLeagueUseCase } from '../../../application/use-cases/league/join-league.use-case';
import { StartLeagueUseCase } from '../../../application/use-cases/league/start-league.use-case';
import { GetStandingsUseCase } from '../../../application/use-cases/league/get-standings.use-case';
import { GetScheduleUseCase } from '../../../application/use-cases/league/get-schedule.use-case';
import { GetRoundUseCase } from '../../../application/use-cases/league/get-round.use-case';
import { GetMatchUseCase } from '../../../application/use-cases/league/get-match.use-case';
import { StartGameUseCase } from '../../../application/use-cases/league/start-game.use-case';
import { ClaimForfeitUseCase } from '../../../application/use-cases/league/claim-forfeit.use-case';
import { AdvanceRoundUseCase } from '../../../application/use-cases/league/advance-round.use-case';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';
import { CreateLeagueDto, StartGameDto } from '../dto/league.dto';

@ApiTags('Leagues')
@Controller('leagues')
export class LeagueController {
  constructor(
    private readonly createLeagueUseCase: CreateLeagueUseCase,
    private readonly joinLeagueUseCase: JoinLeagueUseCase,
    private readonly startLeagueUseCase: StartLeagueUseCase,
    private readonly getStandingsUseCase: GetStandingsUseCase,
    private readonly getScheduleUseCase: GetScheduleUseCase,
    private readonly getRoundUseCase: GetRoundUseCase,
    private readonly getMatchUseCase: GetMatchUseCase,
    private readonly startGameUseCase: StartGameUseCase,
    private readonly claimForfeitUseCase: ClaimForfeitUseCase,
    private readonly advanceRoundUseCase: AdvanceRoundUseCase,
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all leagues' })
  async getAllLeagues() {
    return this.leagueRepo.getAllLeagues();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new league' })
  async createLeague(@Request() req, @Body() dto: CreateLeagueDto) {
    return this.createLeagueUseCase.execute(dto.name, dto.roundDurationDays, req.user.id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join an open league' })
  async joinLeague(@Param('id') id: string, @Request() req) {
    return this.joinLeagueUseCase.execute(id, req.user.id);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a league (must have 12 players)' })
  async startLeague(@Param('id') id: string) {
    return this.startLeagueUseCase.execute(id);
  }

  @Get(':id/standings')
  @ApiOperation({ summary: 'Get current standings for a league' })
  async getStandings(@Param('id') id: string) {
    return this.getStandingsUseCase.execute(id);
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Get complete schedule/rounds for a league' })
  async getSchedule(@Param('id') id: string) {
    return this.getScheduleUseCase.execute(id);
  }

  @Get(':id/rounds/:n')
  @ApiOperation({ summary: 'Get a specific round with its 6 matches' })
  async getRound(
    @Param('id') id: string,
    @Param('n', ParseIntPipe) n: number,
  ) {
    return this.getRoundUseCase.execute(id, n);
  }

  @Get(':id/matches/:matchId')
  @ApiOperation({ summary: 'Get match detail with both games' })
  async getMatch(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
  ) {
    return this.getMatchUseCase.execute(matchId);
  }

  @Post(':id/matches/:matchId/start-game')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start the next game in a match (Game 1 or Game 2)' })
  async startGame(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body() dto: StartGameDto,
    @Request() req,
  ) {
    return this.startGameUseCase.execute(matchId, req.user.id, dto.gameNumber);
  }

  @Post(':id/matches/:matchId/forfeit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim forfeit against opponent (deadline must have passed)' })
  async claimForfeit(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Request() req,
  ) {
    await this.claimForfeitUseCase.execute(matchId, { claimerUserId: req.user.id });
    return { message: 'Forfeit claimed successfully' };
  }

  @Patch(':id/rounds/:n/advance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually advance league to the next round (admin)' })
  async advanceRound(@Param('id') id: string) {
    await this.advanceRoundUseCase.execute(id);
    return { message: 'Round advanced' };
  }

  @Get(':id/my-matches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current player matches in this league' })
  async getMyMatches(@Param('id') id: string, @Request() req) {
    return this.leagueRepo.getMatchesByPlayer(id, req.user.id);
  }
}
