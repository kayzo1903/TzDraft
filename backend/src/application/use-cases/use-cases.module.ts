import { Module, forwardRef } from '@nestjs/common';
import { RepositoryModule } from '../../infrastructure/repositories/repository.module';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';
import { EmailModule } from '../../infrastructure/email/email.module';
import { BeamAfricaService } from '../../infrastructure/sms/beam-africa.service';
import { TournamentNotificationService } from '../services/tournament-notification.service';
import { CreateGameUseCase } from './create-game.use-case';
import { MakeMoveUseCase } from './make-move.use-case';
import { GetGameStateUseCase } from './get-game-state.use-case';
import { GetLegalMovesUseCase } from './get-legal-moves.use-case';
import { EndGameUseCase } from './end-game.use-case';
import { JoinQueueUseCase } from './join-queue.use-case';
import { RatingService } from './rating.service';
import { GetGameHistoryUseCase } from './get-game-history.use-case';
import { GetPlayerStatsUseCase } from './get-player-stats.use-case';
import { UserModule } from '../../domain/user/user.module';
import { CreateTournamentUseCase } from './tournament/create-tournament.use-case';
import { RegisterForTournamentUseCase } from './tournament/register-for-tournament.use-case';
import { WithdrawFromTournamentUseCase } from './tournament/withdraw-from-tournament.use-case';
import { StartTournamentUseCase } from './tournament/start-tournament.use-case';
import { ReportTournamentResultUseCase } from './tournament/report-tournament-result.use-case';
import { AdvanceRoundUseCase } from './tournament/advance-round.use-case';
import { ListTournamentsUseCase } from './tournament/list-tournaments.use-case';
import { GetTournamentUseCase } from './tournament/get-tournament.use-case';
import { AdminRemoveTournamentParticipantUseCase } from './tournament/admin-remove-tournament-participant.use-case';
import { AdminUpdateTournamentUseCase } from './tournament/admin-update-tournament.use-case';
import { AdminCancelTournamentUseCase } from './tournament/admin-cancel-tournament.use-case';
import { AdminResolveTournamentMatchUseCase } from './tournament/admin-resolve-tournament-match.use-case';
import { AiProgressionService } from './ai-progression.service';
import { EligibilityCheckService } from '../../domain/tournament/services/eligibility-check.service';
import { BracketGenerationService } from '../../domain/tournament/services/bracket-generation.service';
import { MatchProgressionService } from '../../domain/tournament/services/match-progression.service';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { MatchmakingAnalyticsService } from '../../infrastructure/analytics/matchmaking-analytics.service';

/**
 * Use Cases Module
 * Provides all application use cases
 */
@Module({
  imports: [RepositoryModule, forwardRef(() => MessagingModule), UserModule, PrismaModule, EmailModule],
  providers: [
    RatingService,
    CreateGameUseCase,
    MakeMoveUseCase,
    GetGameStateUseCase,
    GetLegalMovesUseCase,
    EndGameUseCase,
    JoinQueueUseCase,
    GetGameHistoryUseCase,
    GetPlayerStatsUseCase,
    AiProgressionService,
    // Notification infrastructure
    BeamAfricaService,
    TournamentNotificationService,
    // Tournament domain services
    EligibilityCheckService,
    BracketGenerationService,
    MatchProgressionService,
    MatchmakingAnalyticsService,
    // Tournament use cases
    CreateTournamentUseCase,
    RegisterForTournamentUseCase,
    WithdrawFromTournamentUseCase,
    StartTournamentUseCase,
    ReportTournamentResultUseCase,
    AdvanceRoundUseCase,
    ListTournamentsUseCase,
    GetTournamentUseCase,
    AdminRemoveTournamentParticipantUseCase,
    AdminUpdateTournamentUseCase,
    AdminCancelTournamentUseCase,
    AdminResolveTournamentMatchUseCase,
  ],
  exports: [
    RatingService,
    CreateGameUseCase,
    MakeMoveUseCase,
    GetGameStateUseCase,
    GetLegalMovesUseCase,
    EndGameUseCase,
    JoinQueueUseCase,
    GetGameHistoryUseCase,
    GetPlayerStatsUseCase,
    AiProgressionService,
    MatchmakingAnalyticsService,
    TournamentNotificationService,
    CreateTournamentUseCase,
    RegisterForTournamentUseCase,
    WithdrawFromTournamentUseCase,
    StartTournamentUseCase,
    ReportTournamentResultUseCase,
    AdvanceRoundUseCase,
    ListTournamentsUseCase,
    GetTournamentUseCase,
    AdminRemoveTournamentParticipantUseCase,
    AdminUpdateTournamentUseCase,
    AdminCancelTournamentUseCase,
    AdminResolveTournamentMatchUseCase,
  ],
})
export class UseCasesModule {}
