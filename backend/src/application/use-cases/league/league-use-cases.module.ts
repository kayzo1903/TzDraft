import { Module } from '@nestjs/common';
import { CreateLeagueUseCase } from './create-league.use-case';
import { JoinLeagueUseCase } from './join-league.use-case';
import { StartLeagueUseCase } from './start-league.use-case';
import { GetStandingsUseCase } from './get-standings.use-case';
import { GetScheduleUseCase } from './get-schedule.use-case';
import { GetRoundUseCase } from './get-round.use-case';
import { GetMatchUseCase } from './get-match.use-case';
import { StartGameUseCase } from './start-game.use-case';
import { HandleGameCompletedUseCase } from './handle-game-completed.use-case';
import { ClaimForfeitUseCase } from './claim-forfeit.use-case';
import { HandlePlayerInactiveUseCase } from './handle-player-inactive.use-case';
import { AdvanceRoundUseCase } from './advance-round.use-case';
import { RepositoryModule } from '../../../infrastructure/repositories/repository.module';
import { MessagingModule } from '../../../infrastructure/messaging/messaging.module';
import { ScheduleGenerationService } from '../../../domain/league/services/schedule-generation.service';
import { StandingsService } from '../../../domain/league/services/standings.service';
import { MatchResultService } from '../../../domain/league/services/match-result.service';

@Module({
  imports: [RepositoryModule, MessagingModule],
  providers: [
    CreateLeagueUseCase,
    JoinLeagueUseCase,
    StartLeagueUseCase,
    GetStandingsUseCase,
    GetScheduleUseCase,
    GetRoundUseCase,
    GetMatchUseCase,
    StartGameUseCase,
    HandleGameCompletedUseCase,
    ClaimForfeitUseCase,
    HandlePlayerInactiveUseCase,
    AdvanceRoundUseCase,
    ScheduleGenerationService,
    StandingsService,
    MatchResultService,
  ],
  exports: [
    CreateLeagueUseCase,
    JoinLeagueUseCase,
    StartLeagueUseCase,
    GetStandingsUseCase,
    GetScheduleUseCase,
    GetRoundUseCase,
    GetMatchUseCase,
    StartGameUseCase,
    HandleGameCompletedUseCase,
    ClaimForfeitUseCase,
    HandlePlayerInactiveUseCase,
    AdvanceRoundUseCase,
  ],
})
export class LeagueUseCasesModule {}
