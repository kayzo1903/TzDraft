import { Injectable, Logger } from '@nestjs/common';
import { CreateGameUseCase } from '../use-cases/create-game.use-case';
import { GameType } from '../../shared/constants/game.constants';
import { Socket } from 'socket.io';
import { Inject, forwardRef } from '@nestjs/common';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';

interface QueuedPlayer {
  socketId: string;
  userId?: string; // Optional for guests
  rating?: number; // Optional for guests
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
    @Inject(forwardRef(() => GamesGateway))
    private readonly gamesGateway: GamesGateway,
  ) {
    this.startMatchmakingLoop();
  }

  joinQueue(client: Socket, mode: GameType, guestName?: string) {
    const userId = client.data.user?.id;
    const rating = client.data.user?.rating?.rating || 1200;

    // Remove if already in queue to avoid duplicates
    this.leaveQueue(client.id);

    const player: QueuedPlayer = {
      socketId: client.id,
      userId,
      rating: userId ? rating : undefined,
      guestName,
      mode,
      joinedAt: Date.now(),
    };

    this.queue.push(player);
    this.logger.log(`Player joined queue: ${guestName || userId} (${mode})`);

    // Try to match immediately
    this.processQueue();
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
        `In queue: ${p.socketId} (${p.mode}) - User: ${p.userId}`,
      ),
    );

    if (this.queue.length < 2) return;

    // Separate queues by mode
    const rankedQueue = this.queue.filter((p) => p.mode === GameType.RANKED);
    const casualQueue = this.queue.filter((p) => p.mode === GameType.CASUAL);

    this.logger.debug(
      `Ranked: ${rankedQueue.length}, Casual: ${casualQueue.length}`,
    );

    await this.processSubQueue(rankedQueue);
    await this.processSubQueue(casualQueue);
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

      game = await this.createGameUseCase.createPvPGame(
        p1.userId || null,
        p2.userId || null,
        p1.rating || 1200,
        p2.rating || 1200,
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
}
