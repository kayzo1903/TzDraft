import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import type { IGameRepository } from '../../../domain/game/repositories/game.repository.interface';
import {
  BracketGenerationService,
  MatchStub,
} from '../../../domain/tournament/services/bracket-generation.service';
import {
  Tournament,
  TournamentStatus,
  TournamentStyle,
} from '../../../domain/tournament/entities/tournament.entity';
import {
  TournamentRound,
  RoundStatus,
} from '../../../domain/tournament/entities/tournament-round.entity';
import {
  TournamentMatch,
  MatchStatus,
  MatchResult,
} from '../../../domain/tournament/entities/tournament-match.entity';
import { TournamentMatchGame } from '../../../domain/tournament/entities/tournament-match-game.entity';
import {
  TournamentParticipant,
  ParticipantStatus,
} from '../../../domain/tournament/entities/tournament-participant.entity';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import { Game } from '../../../domain/game/entities/game.entity';
import {
  GameType,
  GameStatus,
  PlayerColor,
} from '../../../shared/constants/game.constants';
import { TournamentNotificationService } from '../../services/tournament-notification.service';

const STYLE_TIME_MS: Record<TournamentStyle, number> = {
  [TournamentStyle.BLITZ]: 5 * 60 * 1000,
  [TournamentStyle.RAPID]: 10 * 60 * 1000,
  [TournamentStyle.CLASSICAL]: 30 * 60 * 1000,
  [TournamentStyle.UNLIMITED]: 0,
};

@Injectable()
export class StartTournamentUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
    @Inject('IGameRepository')
    private readonly gameRepo: IGameRepository,
    private readonly bracket: BracketGenerationService,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gateway: GamesGateway,
    private readonly notificationService: TournamentNotificationService,
  ) {}

  async execute(tournamentId: string): Promise<Tournament> {
    const tournament = await this.repo.findById(tournamentId);
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== TournamentStatus.REGISTRATION) {
      throw new BadRequestException('Tournament is not in REGISTRATION status');
    }

    const participants =
      await this.repo.findParticipantsByTournament(tournamentId);

    if (participants.length < tournament.minPlayers) {
      tournament.status = TournamentStatus.CANCELLED;
      await this.repo.update(tournament);
      return tournament;
    }

    // Seed participants
    const seeded = this.bracket.assignSeeds(participants);
    await Promise.all(seeded.map((p) => this.repo.updateParticipant(p)));

    // Generate rounds and matches depending on the format
    const isRoundRobin = tournament.format === 'ROUND_ROBIN';
    let matchCountTotal = 0;

    if (isRoundRobin) {
      const scheduleLines = this.bracket.generateRoundRobinSchedules(
        seeded,
        tournamentId,
      );

      for (let i = 0; i < scheduleLines.length; i++) {
        const roundNumber = i + 1;
        const round = new TournamentRound(
          randomUUID(),
          tournamentId,
          roundNumber,
          roundNumber === 1 ? RoundStatus.ACTIVE : RoundStatus.PENDING,
          roundNumber === 1 ? new Date() : null,
        );
        const savedRound = await this.repo.createRound(round);

        const stubs = scheduleLines[i] ?? [];
        for (const stub of stubs) {
          stub.roundId = savedRound.id;
          await this.createMatchFromStub(
            stub,
            tournament,
            seeded,
            roundNumber === 1,
          );
        }
        matchCountTotal += stubs.length;
      }
    } else {
      // SINGLE_ELIMINATION
      const round = new TournamentRound(
        randomUUID(),
        tournamentId,
        1,
        RoundStatus.ACTIVE,
        new Date(),
      );
      const savedRound = await this.repo.createRound(round);

      const stubs = this.bracket.generateRound1(
        seeded,
        savedRound.id,
        tournamentId,
      );

      for (const stub of stubs) {
        await this.createMatchFromStub(stub, tournament, seeded, true);
      }
      matchCountTotal += stubs.length;
    }

    // Mark tournament active
    tournament.status = TournamentStatus.ACTIVE;
    const saved = await this.repo.update(tournament);

    // Emit round-start event
    this.gateway.emitTournamentRoundAdvanced(tournamentId, {
      roundNumber: 1,
      tournamentId,
    });

    const participantIds = seeded.map((p) => p.userId);
    void this.notificationService.notifyTournamentStarted(
      participantIds,
      saved,
      matchCountTotal,
    );

    return saved;
  }

  async spawnGameForMatch(
    match: TournamentMatch,
    tournament: Tournament,
    gameNumber: number,
    player1Id: string,
    player2Id: string,
    roundNumber = 1,
  ): Promise<void> {
    const isExtra = gameNumber > 3;
    // Colors rotate each game: odd gameNumber → p1=WHITE, even → p1=BLACK
    const p1IsWhite = gameNumber % 2 === 1;
    const whiteId = p1IsWhite ? player1Id : player2Id;
    const blackId = p1IsWhite ? player2Id : player1Id;

    const matchGameId = randomUUID();
    const matchGame = new TournamentMatchGame(
      matchGameId,
      match.id,
      gameNumber,
      isExtra,
    );
    await this.repo.createMatchGame(matchGame);

    const initialTimeMs = STYLE_TIME_MS[tournament.style] ?? 600000;
    const game = new Game(
      randomUUID(),
      whiteId,
      blackId,
      GameType.TOURNAMENT,
      null,
      null,
      null,
      initialTimeMs,
      undefined,
      new Date(),
      null,
      null,
      GameStatus.ACTIVE,
      null,
      null,
      PlayerColor.WHITE,
      null,
      null,
      matchGameId,
    );
    const savedGame = await this.gameRepo.create(game);

    match.currentGameId = savedGame.id;
    match.status = MatchStatus.ACTIVE;
    if (!match.startedAt) match.startedAt = new Date();
    await this.repo.updateMatch(match);

    // Notify both players via WS
    this.gateway.emitTournamentMatchGameReady(player1Id, player2Id, {
      matchId: match.id,
      gameId: savedGame.id,
      gameNumber,
      isExtra,
      tournamentId: match.tournamentId,
    });

    // Notify match assigned (only on game 1 — first game of the match)
    if (gameNumber === 1) {
      void this.notificationService.notifyMatchAssigned(
        player1Id,
        player2Id,
        match,
        tournament,
        roundNumber,
      );
    }
  }

  private async createMatchFromStub(
    stub: MatchStub,
    tournament: Tournament,
    participants: TournamentParticipant[],
    spawnGame: boolean = true,
  ): Promise<void> {
    const matchId = randomUUID();
    const match = new TournamentMatch(
      matchId,
      stub.roundId,
      stub.tournamentId,
      stub.isBye ? MatchStatus.BYE : MatchStatus.PENDING,
      stub.isBye ? MatchResult.BYE : null,
      stub.player1Id,
      stub.player2Id,
    );

    if (stub.isBye) {
      match.completedAt = new Date();
      // Advance the player who received the BYE (player1 always gets the bye slot)
      if (stub.player1Id) {
        const p = participants.find((x) => x.userId === stub.player1Id);
        if (p) {
          p.matchWins += 1;
          p.status = ParticipantStatus.ACTIVE;
          await this.repo.updateParticipant(p);
        }
      }
      await this.repo.createMatch(match);
      return;
    }

    const savedMatch = await this.repo.createMatch(match);

    if (stub.player1Id && stub.player2Id && spawnGame) {
      await this.spawnGameForMatch(
        savedMatch,
        tournament,
        1,
        stub.player1Id,
        stub.player2Id,
        1,
      );
    }
  }
}
