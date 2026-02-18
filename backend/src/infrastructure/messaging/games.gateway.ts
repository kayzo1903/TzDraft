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
import { MakeMoveUseCase } from '../../application/use-cases/make-move.use-case';
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
  private readonly drawOffers = new Map<
    string,
    { offeredBy: string; expiresAt: number; timer: NodeJS.Timeout }
  >();
  private readonly DRAW_OFFER_TTL_MS = 60_000;

  constructor(
    @Inject(forwardRef(() => MatchmakingService))
    private readonly matchmakingService: MatchmakingService,
    @Inject(forwardRef(() => EndGameUseCase))
    private readonly endGameUseCase: EndGameUseCase,
    @Inject(forwardRef(() => MakeMoveUseCase))
    private readonly makeMoveUseCase: MakeMoveUseCase,
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

  private clearDrawOffer(gameId: string) {
    const offer = this.drawOffers.get(gameId);
    if (!offer) return;
    clearTimeout(offer.timer);
    this.drawOffers.delete(gameId);
  }

  @SubscribeMessage('requestDraw')
  async handleRequestDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { status: 'error', message: 'User not authenticated' };
    }
    const gameId = data?.gameId;
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    try {
      const game = await this.gameRepository.findById(gameId);
      if (!game) return { status: 'error', message: 'Game not found' };
      if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
        return { status: 'error', message: 'Player not in this game' };
      }
      if (game.status !== 'ACTIVE') {
        return { status: 'error', message: 'Game is not active' };
      }

      const existing = this.drawOffers.get(gameId);
      if (existing) {
        if (existing.offeredBy === userId) {
          return { status: 'success', message: 'Draw already offered' };
        }
        // Opponent had already offered; accepting ends immediately.
        await this.endGameUseCase.drawByAgreement(gameId);
        this.clearDrawOffer(gameId);
        return { status: 'success', message: 'Draw accepted' };
      }

      const expiresAt = Date.now() + this.DRAW_OFFER_TTL_MS;
      const timer = setTimeout(() => {
        this.drawOffers.delete(gameId);
        this.server.to(gameId).emit('drawOfferExpired', { gameId });
      }, this.DRAW_OFFER_TTL_MS);

      this.drawOffers.set(gameId, { offeredBy: userId, expiresAt, timer });
      this.server.to(gameId).emit('drawOffered', {
        gameId,
        offeredBy: userId,
        expiresAt,
      });
      return { status: 'success' };
    } catch (error: any) {
      this.logger.warn(`requestDraw failed game=${gameId} user=${userId}`, error);
      return { status: 'error', message: 'Failed to request draw' };
    }
  }

  @SubscribeMessage('respondDraw')
  async handleRespondDraw(
    @MessageBody() data: { gameId: string; accept: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { status: 'error', message: 'User not authenticated' };
    }
    const gameId = data?.gameId;
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    const offer = this.drawOffers.get(gameId);
    if (!offer) {
      return { status: 'error', message: 'No active draw offer' };
    }
    if (offer.offeredBy === userId) {
      return { status: 'error', message: 'Cannot respond to your own draw offer' };
    }

    if (data.accept) {
      try {
        await this.endGameUseCase.drawByAgreement(gameId);
        this.clearDrawOffer(gameId);
        return { status: 'success' };
      } catch (error: any) {
        this.logger.warn(
          `respondDraw accept failed game=${gameId} user=${userId}`,
          error,
        );
        return { status: 'error', message: 'Failed to accept draw' };
      }
    }

    this.clearDrawOffer(gameId);
    this.server.to(gameId).emit('drawDeclined', {
      gameId,
      declinedBy: userId,
    });
    return { status: 'success' };
  }

  @SubscribeMessage('cancelDraw')
  async handleCancelDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { status: 'error', message: 'User not authenticated' };
    }
    const gameId = data?.gameId;
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    const offer = this.drawOffers.get(gameId);
    if (!offer) return { status: 'success' };
    if (offer.offeredBy !== userId) {
      return { status: 'error', message: 'Only offerer can cancel' };
    }

    this.clearDrawOffer(gameId);
    this.server.to(gameId).emit('drawCancelled', { gameId, cancelledBy: userId });
    return { status: 'success' };
  }

  @SubscribeMessage('joinGame')
  async handleJoinGame(
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

    // Tell the joining client which perspective to render from.
    // This avoids relying on fragile client-side sessionStorage when refreshing.
    if (userId) {
      try {
        const game = await this.gameRepository.findById(gameId);
        const playerColor =
          game?.whitePlayerId === userId
            ? 'WHITE'
            : game?.blackPlayerId === userId
              ? 'BLACK'
              : null;

        if (playerColor) {
          client.emit('joinedGame', { gameId, playerColor });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to resolve playerColor for joinGame game=${gameId} user=${userId}`,
          error as any,
        );
      }
    }
    return { status: 'success', message: `Joined game ${gameId}` };
  }

  @SubscribeMessage('makeMove')
  async handleMakeMove(
    @MessageBody() data: { gameId: string; from: number; to: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { status: 'error', message: 'User not authenticated' };
    }

    this.logger.log(
      `Make move request from ${userId} in game ${data.gameId}: ${data.from} -> ${data.to}`,
    );

    try {
      const result = await this.makeMoveUseCase.execute(
        data.gameId,
        userId,
        data.from,
        data.to,
      );

      // Success - update strictly handled by UseCase via emitGameStateUpdate
      return { status: 'success' };
    } catch (error: any) {
      this.logger.error(`Move failed: ${error.message}`);
      return { status: 'error', message: error.message };
    }
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
    let activeGames: { id: string }[] = [];
    try {
      activeGames = await this.gameRepository.findActiveGamesByPlayer(userId);
    } catch (error) {
      this.logger.warn(
        `Failed to load active games for disconnect user=${userId}. Skipping disconnect forfeit scheduling.`,
        error as any,
      );
      return;
    }
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
    let activeGames: { id: string }[] = [];
    try {
      activeGames = await this.gameRepository.findActiveGamesByPlayer(userId);
    } catch (error) {
      this.logger.warn(
        `Failed to load active games for reconnect user=${userId}. Skipping disconnect forfeit cleanup.`,
        error as any,
      );
      return;
    }
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
