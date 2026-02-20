import { Injectable, Logger } from '@nestjs/common';
import { CreateGameUseCase } from '../use-cases/create-game.use-case';
import { GameType } from '../../shared/constants/game.constants';
import { Socket } from 'socket.io';
import { Inject, forwardRef } from '@nestjs/common';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

interface QueuedPlayer {
  socketId: string;
  participantId: string;
  rating: number;
  isGuest: boolean;
  guestName?: string; // For guests
  mode: GameType;
  joinedAt: number;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private queue: QueuedPlayer[] = [];
  private interval: NodeJS.Timeout;

  constructor(
    private readonly createGameUseCase: CreateGameUseCase,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gamesGateway: GamesGateway,
  ) {
    this.startMatchmakingLoop();
  }

  joinQueue(client: Socket, mode: GameType, guestName?: string): boolean {
    const userId = client.data.user?.id;
    const participantId = userId || client.data.guestId;
    const isGuest = !userId;
    const rating =
      mode === GameType.RANKED
        ? (client.data.user?.rating?.rating ?? 1200)
        : 500;

    if (!participantId) {
      this.logger.warn(`Queue join rejected: missing participant identity (${client.id})`);
      return false;
    }

    // Remove if already in queue to avoid duplicates
    this.leaveQueue(client.id);

    const player: QueuedPlayer = {
      socketId: client.id,
      participantId,
      rating,
      isGuest,
      guestName,
      mode,
      joinedAt: Date.now(),
    };

    this.queue.push(player);
    this.logger.log(`Player joined queue: ${guestName || participantId} (${mode})`);

    // Try to match immediately
    this.processQueue();
    return true;
  }

  leaveQueue(socketId: string) {
    const index = this.queue.findIndex((p) => p.socketId === socketId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.logger.log(`Player left queue: ${socketId}`);
    }
  }

  private startMatchmakingLoop() {
    this.interval = setInterval(() => this.processQueue(), 5000);
  }

  private async processQueue() {
    this.logger.debug(`Processing queue. Current size: ${this.queue.length}`);
    this.queue.forEach((p) =>
      this.logger.debug(
        `In queue: ${p.socketId} (${p.mode}) - Participant: ${p.participantId}`,
      ),
    );

    if (this.queue.length < 2) return;

    // Separate queues by mode
    const rankedQueue = this.queue.filter((p) => p.mode === GameType.RANKED);
    const casualRegisteredQueue = this.queue.filter(
      (p) => p.mode === GameType.CASUAL && !p.isGuest,
    );
    const casualGuestQueue = this.queue.filter(
      (p) => p.mode === GameType.CASUAL && p.isGuest,
    );

    this.logger.debug(
      `Ranked: ${rankedQueue.length}, Casual(registered): ${casualRegisteredQueue.length}, Casual(guest): ${casualGuestQueue.length}`,
    );

    await this.processSubQueue(rankedQueue);
    await this.processSubQueue(casualRegisteredQueue);
    await this.processSubQueue(casualGuestQueue);
  }

  private async processSubQueue(subQueue: QueuedPlayer[]) {
    while (subQueue.length >= 2) {
      // Simple FIFO matching for now.
      // TODO: Implement rating-based matching for Ranked
      const player1 = subQueue.shift();
      const player2 = subQueue.shift();

      if (!player1 || !player2) break;

      // Remove from main queue
      this.leaveQueue(player1.socketId);
      this.leaveQueue(player2.socketId);

      try {
        await this.createGame(player1, player2);
      } catch (error) {
        this.logger.error('Error creating game match', error);
        // Refund players to queue? For now just log.
      }
    }
  }

  private async createGame(p1: QueuedPlayer, p2: QueuedPlayer) {
    this.logger.log(`Creating game for ${p1.socketId} and ${p2.socketId}`);

    try {
      let game;
      const isRanked = p1.mode === GameType.RANKED;
      // Ensure both players want the same mode
      if (p1.mode !== p2.mode) {
        this.logger.error(
          'Mode mismatch in matching? Should be filtered by processSubQueue',
        );
        return;
      }

      await Promise.all([
        this.ensureGuestParticipantRecord(p1),
        this.ensureGuestParticipantRecord(p2),
      ]);

      game = await this.createGameUseCase.createPvPGame(
        p1.participantId,
        p2.participantId,
        isRanked ? p1.rating : 500,
        isRanked ? p2.rating : 500,
        p1.guestName,
        p2.guestName,
        p1.mode,
      );

      // Notify players
      // We need to tell the Gateway to join these sockets to the game room
      // and emit the game start event.
      this.gamesGateway.server.in(p1.socketId).socketsJoin(game.id);
      this.gamesGateway.server.in(p2.socketId).socketsJoin(game.id);

      const payload = {
        gameId: game.id,
        whiteId: game.whitePlayerId,
        blackId: game.blackPlayerId,
        whiteName: p1.guestName || 'White', // We might want to fetch names but IDs are enough for frontend redirection
        blackName: p2.guestName || 'Black',
      };

      // Keep gameFound for backward compatibility with existing clients.
      this.gamesGateway.server.to(game.id).emit('gameFound', payload);
      this.gamesGateway.server.to(p1.socketId).emit('gameStarted', {
        ...payload,
        playerColor: 'WHITE',
      });
      this.gamesGateway.server.to(p2.socketId).emit('gameStarted', {
        ...payload,
        playerColor: 'BLACK',
      });

      this.logger.log(`Game match created: ${game.id}`);
    } catch (error) {
      this.logger.error('Failed to create game match', error);
    }
  }

  private async ensureGuestParticipantRecord(player: QueuedPlayer): Promise<void> {
    if (!player.isGuest) {
      return;
    }

    const participantToken = player.participantId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fallbackName = `Guest-${participantToken.slice(0, 8)}`;
    const displayName = player.guestName?.trim() || fallbackName;

    await this.prisma.user.upsert({
      where: { id: player.participantId },
      update: {},
      create: {
        id: player.participantId,
        phoneNumber: `guest-${participantToken}`,
        username: `guest_${participantToken}`,
        displayName,
        passwordHash: null,
      },
    });
  }
}
