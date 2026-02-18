import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsOptionalJwtGuard } from '../../auth/guards/ws-optional-jwt.guard';

import { MatchmakingService } from '../../application/services/matchmaking.service';
import { GameType } from '../../shared/constants/game.constants';
import { forwardRef, Inject } from '@nestjs/common';
import { EndGameUseCase } from '../../application/use-cases/end-game.use-case';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';

@WebSocketGateway({
  cors: {
    // Keep WS CORS permissive in development to avoid localhost/127.0.0.1 mismatches.
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || 'https://tzdraft.com'
        : true,
    credentials: true,
  },
  namespace: 'games',
})
@UseGuards(WsOptionalJwtGuard)
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GamesGateway');
  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();
  private readonly gameTimers = new Map<string, NodeJS.Timeout>();
  private readonly DISCONNECT_GRACE_MS = 60_000;

  constructor(
    @Inject(forwardRef(() => MatchmakingService))
    private readonly matchmakingService: MatchmakingService,
    @Inject(forwardRef(() => EndGameUseCase))
    private readonly endGameUseCase: EndGameUseCase,
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
  ) {}

  handleConnection(client: Socket) {
    const userId = client.data.user?.id;
    this.logger.log(
      `Client connected: ${client.id} (User: ${userId || 'unknown'})`,
    );
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    this.logger.log(
      `Client disconnected: ${client.id} (User: ${userId || 'unknown'})`,
    );
    this.matchmakingService.leaveQueue(client.id);

    if (userId) {
      this.scheduleDisconnectForfeit(userId);
    }
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() payload: string | { gameId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const gameId = typeof payload === 'string' ? payload : payload?.gameId;
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    const userId = client.data.user?.id;
    if (userId) {
      this.clearDisconnectForfeit(userId);
    }
    client.join(gameId);
    this.logger.log(
      `Client ${client.id} (User: ${userId}) joined game room: ${gameId}`,
    );
    return { status: 'success', message: `Joined game ${gameId}` };
  }

  @SubscribeMessage('findMatch')
  handleFindMatch(
    @MessageBody() data: { mode: 'RANKED' | 'CASUAL'; guestName?: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `Client ${client.id} requesting match: ${JSON.stringify(data)}`,
    );

    const userId = client.data.user?.id;
    if (userId) {
      this.clearDisconnectForfeit(userId);
    }

    // Validate inputs
    if (data.mode === 'RANKED' && !client.data.user) {
      return { status: 'error', message: 'Must be logged in for Ranked' };
    }

    const gameMode = data.mode === 'RANKED' ? GameType.RANKED : GameType.CASUAL;

    // Verify MatchmakingService availability
    if (!this.matchmakingService) {
      this.logger.error('MatchmakingService not initialized');
      return { status: 'error', message: 'Matchmaking unavailable' };
    }

    this.matchmakingService.joinQueue(client, gameMode, data.guestName);
    return { status: 'success', message: 'Joined matchmaking queue' };
  }

  @SubscribeMessage('cancelMatch')
  handleCancelMatch(@ConnectedSocket() client: Socket) {
    if (this.matchmakingService) {
      this.matchmakingService.leaveQueue(client.id);
      return { status: 'success', message: 'Left matchmaking queue' };
    }
    return { status: 'error', message: 'Matchmaking unavailable' };
  }

  // Method to be called by the application layer
  emitGameStateUpdate(gameId: string, gameState: any) {
    this.server.to(gameId).emit('gameStateUpdated', gameState);
    this.logger.log(`Emitted gameStateUpdated for game: ${gameId}`);
  }

  emitGameOver(gameId: string, result: any) {
    this.clearGameTimer(gameId);
    this.server.to(gameId).emit('gameOver', result);
    this.logger.log(`Emitted gameOver for game: ${gameId}`);
  }

  emitGameStart(gameId: string, players: string[]) {
    // Notify players via their socket IDs (joined to room)
    this.server.to(gameId).emit('gameStarted', { gameId });
    this.logger.log(`Emitted gameStarted for game: ${gameId}`);
  }

  /**
   * Schedule a timeout for a game
   * @param gameId Game ID
   * @param durationMs Duration in milliseconds until timeout
   * @param playerId Player who will lose on timeout
   */
  scheduleGameTimeout(gameId: string, durationMs: number, playerId: string) {
    this.clearGameTimer(gameId);

    // Add a small buffer (e.g. 500ms) to allow for network latency and ensure
    // we don't timeout prematurely when the client thinks it still has a split second.
    const bufferMs = 500;
    const timeoutMs = Math.max(0, durationMs + bufferMs);

    this.logger.log(
      `Scheduling timeout for game ${gameId} in ${timeoutMs}ms (Player: ${playerId})`,
    );

    const timer = setTimeout(async () => {
      this.gameTimers.delete(gameId);
      try {
        await this.endGameUseCase.timeout(gameId, playerId);
      } catch (error) {
        this.logger.error(
          `Timeout enforcement failed for game=${gameId} user=${playerId}`,
          error as any,
        );
      }
    }, timeoutMs);

    this.gameTimers.set(gameId, timer);
  }

  /**
   * Clear any active timeout for a game
   */
  clearGameTimer(gameId: string) {
    const timer = this.gameTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.gameTimers.delete(gameId);
    }
  }

  private disconnectKey(gameId: string, userId: string) {
    return `${gameId}:${userId}`;
  }

  private async scheduleDisconnectForfeit(userId: string) {
    const activeGames =
      await this.gameRepository.findActiveGamesByPlayer(userId);
    for (const game of activeGames) {
      const key = this.disconnectKey(game.id, userId);
      if (this.disconnectTimers.has(key)) continue;

      const timer = setTimeout(async () => {
        this.disconnectTimers.delete(key);
        try {
          await this.endGameUseCase.disconnectForfeit(game.id, userId);
        } catch (error) {
          this.logger.error(
            `Disconnect forfeit failed for game=${game.id} user=${userId}`,
            error as any,
          );
        }
      }, this.DISCONNECT_GRACE_MS);

      this.disconnectTimers.set(key, timer);
      this.server.to(game.id).emit('playerDisconnected', {
        playerId: userId,
        timeoutSec: Math.floor(this.DISCONNECT_GRACE_MS / 1000),
      });
      this.logger.warn(
        `Player ${userId} disconnected in game ${game.id}. Forfeit in ${this.DISCONNECT_GRACE_MS}ms if not reconnected.`,
      );
    }
  }

  private async clearDisconnectForfeit(userId: string) {
    const activeGames =
      await this.gameRepository.findActiveGamesByPlayer(userId);
    for (const game of activeGames) {
      const key = this.disconnectKey(game.id, userId);
      const timer = this.disconnectTimers.get(key);
      if (!timer) continue;
      clearTimeout(timer);
      this.disconnectTimers.delete(key);
      this.server.to(game.id).emit('playerReconnected', {
        playerId: userId,
      });
      this.logger.log(
        `Player ${userId} reconnected in game ${game.id}. Disconnect forfeit cancelled.`,
      );
    }
  }
}
