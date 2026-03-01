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
import { ModuleRef } from '@nestjs/core';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import { MakeMoveUseCase } from '../../application/use-cases/make-move.use-case';
import { EndGameUseCase } from '../../application/use-cases/end-game.use-case';
import { CreateGameUseCase } from '../../application/use-cases/create-game.use-case';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GameStatus, GameType } from '../../shared/constants/game.constants';

/** Grace period in ms before an abandoned player is auto-resigned. */
const ABANDON_TIMEOUT_MS = 60_000;

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'games',
})
@UseGuards(WsJwtGuard)
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GamesGateway');

  /**
   * Tracks pending draw offers: gameId → userId who offered.
   * Cleared when the draw is accepted, declined, or the game ends.
   */
  private pendingDrawOffers = new Map<string, string>();

  /**
   * Tracks pending rematch offers: gameId → userId who offered.
   */
  private pendingRematchOffers = new Map<string, string>();

  /**
   * Maps userId → gameId for the game they most recently joined.
   * Used to detect which game to auto-resign when a player disconnects.
   */
  private userGameMap = new Map<string, string>();

  /**
   * Active abandonment timers: userId → setTimeout handle.
   * Cleared on reconnect or when the game ends.
   */
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly moduleRef: ModuleRef) {}

  handleConnection(client: Socket) {
    try {
      const jwtService = this.moduleRef.get(JwtService, { strict: false });
      const configService = this.moduleRef.get(ConfigService, {
        strict: false,
      });

      // Read token from handshake.auth first, then Authorization header
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (() => {
          const header = client.handshake.headers.authorization ?? '';
          const [type, t] = header.split(' ');
          return type === 'Bearer' ? t : null;
        })();

      if (!token) {
        this.logger.warn(`Socket ${client.id} rejected: no token`);
        client.disconnect();
        return;
      }

      const payload = jwtService.verify(token, {
        secret: configService.get('JWT_SECRET'),
      });

      client.data.user = { id: payload.sub };
      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch {
      this.logger.warn(`Socket ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    this.logger.log(
      `Client disconnected: ${client.id} (User: ${userId || 'unknown'})`,
    );

    if (!userId) return;
    const gameId = this.userGameMap.get(userId);
    if (!gameId) return;

    // Notify the opponent immediately
    this.server.to(gameId).emit('opponentDisconnected', { userId });

    // Start abandonment timer — auto-resign if they don't reconnect in time
    const timer = setTimeout(async () => {
      this.disconnectTimers.delete(userId);
      this.userGameMap.delete(userId);

      try {
        const repo = this.moduleRef.get<any>('IGameRepository', {
          strict: false,
        });
        const game = await repo.findById(gameId);

        // Only auto-resign active PvP games
        if (
          !game ||
          game.status !== GameStatus.ACTIVE ||
          game.gameType === GameType.AI
        ) {
          return;
        }

        const endGameUseCase = this.moduleRef.get(EndGameUseCase, {
          strict: false,
        });
        const { winner } = await endGameUseCase.resign(gameId, userId);
        this.emitGameOver(gameId, {
          gameId,
          winner: winner.toString(),
          reason: 'abandon',
        });
        this.logger.log(
          `Auto-resigned user ${userId} from game ${gameId} (abandoned)`,
        );
      } catch (err) {
        this.logger.error(`Auto-resign failed for game ${gameId}`, err);
      }
    }, ABANDON_TIMEOUT_MS);

    this.disconnectTimers.set(userId, timer);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    const userId = client.data.user?.id;
    client.join(gameId);
    this.logger.log(
      `Client ${client.id} (User: ${userId}) joined game room: ${gameId}`,
    );

    if (userId) {
      // Cancel any pending abandonment timer (player reconnected)
      const existing = this.disconnectTimers.get(userId);
      if (existing) {
        clearTimeout(existing);
        this.disconnectTimers.delete(userId);
        // Let opponent know the player is back
        this.server.to(gameId).emit('opponentReconnected', { userId });
        this.logger.log(`User ${userId} reconnected to game ${gameId}`);
      }
      this.userGameMap.set(userId, gameId);
    }

    return { status: 'success', message: `Joined game ${gameId}` };
  }

  /**
   * Real-time move submission via WebSocket.
   */
  @SubscribeMessage('makeMove')
  async handleMakeMove(
    @MessageBody() data: { gameId: string; from: number; to: number },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    try {
      const makeMoveUseCase = this.moduleRef.get(MakeMoveUseCase, {
        strict: false,
      });
      await makeMoveUseCase.execute(data.gameId, userId, data.from, data.to);
      return {};
    } catch (err: any) {
      const message = err?.response?.message || err?.message || 'Invalid move';
      return { error: message };
    }
  }

  /* ── Draw offer flow ─────────────────────────────────────────────────── */

  /**
   * Player sends a draw offer.
   * Emits `drawOffered` to both players so the opponent can accept/decline.
   */
  @SubscribeMessage('offerDraw')
  async handleOfferDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const existing = this.pendingDrawOffers.get(data.gameId);
    if (existing === userId) {
      return { error: 'You already have a pending draw offer' };
    }

    // Store the offer
    this.pendingDrawOffers.set(data.gameId, userId);
    this.logger.log(`Draw offered in game ${data.gameId} by ${userId}`);

    // Tell both players a draw was offered (offeredByUserId lets the UI know who offered)
    this.server.to(data.gameId).emit('drawOffered', {
      gameId: data.gameId,
      offeredByUserId: userId,
    });

    return {};
  }

  /**
   * Opponent accepts the draw offer → end game as DRAW.
   */
  @SubscribeMessage('acceptDraw')
  async handleAcceptDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const offeredBy = this.pendingDrawOffers.get(data.gameId);
    if (!offeredBy) return { error: 'No pending draw offer' };
    if (offeredBy === userId)
      return { error: 'Cannot accept your own draw offer' };

    this.pendingDrawOffers.delete(data.gameId);

    try {
      const endGameUseCase = this.moduleRef.get(EndGameUseCase, {
        strict: false,
      });
      await endGameUseCase.drawByAgreement(data.gameId, userId);
      this.emitGameOver(data.gameId, {
        gameId: data.gameId,
        winner: 'DRAW',
        reason: 'draw_agreement',
      });
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Failed to end game as draw' };
    }
  }

  /**
   * Opponent declines the draw offer.
   */
  @SubscribeMessage('declineDraw')
  handleDeclineDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): { error?: string } {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const offeredBy = this.pendingDrawOffers.get(data.gameId);
    if (!offeredBy) return { error: 'No pending draw offer' };
    if (offeredBy === userId)
      return { error: 'Cannot decline your own draw offer' };

    this.pendingDrawOffers.delete(data.gameId);
    this.logger.log(`Draw declined in game ${data.gameId} by ${userId}`);

    this.server.to(data.gameId).emit('drawDeclined', {
      gameId: data.gameId,
      declinedByUserId: userId,
    });

    return {};
  }

  /**
   * Cancel a previously sent draw offer (before opponent responds).
   */
  @SubscribeMessage('cancelDraw')
  handleCancelDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): { error?: string } {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const offeredBy = this.pendingDrawOffers.get(data.gameId);
    if (offeredBy !== userId) return { error: 'No draw offer to cancel' };

    this.pendingDrawOffers.delete(data.gameId);
    this.server.to(data.gameId).emit('drawCancelled', { gameId: data.gameId });
    return {};
  }

  /* ── Rematch flow ────────────────────────────────────────────────────── */

  @SubscribeMessage('offerRematch')
  handleOfferRematch(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): { error?: string } {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    if (this.pendingRematchOffers.get(data.gameId) === userId) {
      return { error: 'You already offered a rematch' };
    }

    this.pendingRematchOffers.set(data.gameId, userId);
    this.server
      .to(data.gameId)
      .emit('rematchOffered', { offeredByUserId: userId });
    this.logger.log(`Rematch offered in game ${data.gameId} by ${userId}`);
    return {};
  }

  @SubscribeMessage('acceptRematch')
  async handleAcceptRematch(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const offeredBy = this.pendingRematchOffers.get(data.gameId);
    if (!offeredBy) return { error: 'No pending rematch offer' };
    if (offeredBy === userId) return { error: 'Cannot accept your own rematch offer' };

    this.pendingRematchOffers.delete(data.gameId);

    try {
      const createGameUseCase = this.moduleRef.get(CreateGameUseCase, {
        strict: false,
      });
      const newGame = await createGameUseCase.createRematch(data.gameId);
      this.server
        .to(data.gameId)
        .emit('rematchAccepted', { newGameId: newGame.id });
      this.logger.log(
        `Rematch accepted for game ${data.gameId} → new game ${newGame.id}`,
      );
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Failed to create rematch' };
    }
  }

  @SubscribeMessage('declineRematch')
  handleDeclineRematch(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): { error?: string } {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    this.pendingRematchOffers.delete(data.gameId);
    this.server.to(data.gameId).emit('rematchDeclined', { declinedByUserId: userId });
    return {};
  }

  @SubscribeMessage('cancelRematch')
  handleCancelRematch(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): { error?: string } {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    if (this.pendingRematchOffers.get(data.gameId) !== userId) {
      return { error: 'No rematch offer to cancel' };
    }

    this.pendingRematchOffers.delete(data.gameId);
    this.server.to(data.gameId).emit('rematchCancelled', {});
    return {};
  }

  /* ── Emit helpers (called by application layer) ─────────────────────── */

  emitGameStateUpdate(gameId: string, gameState: any) {
    this.server.to(gameId).emit('gameStateUpdated', gameState);
    this.logger.log(`Emitted gameStateUpdated for game: ${gameId}`);
  }

  emitGameOver(gameId: string, result: any) {
    // Clear any pending draw or rematch offers when the game ends
    this.pendingDrawOffers.delete(gameId);
    this.pendingRematchOffers.delete(gameId);

    // Cancel any abandonment timers for players in this game and clear mappings
    for (const [userId, gid] of this.userGameMap.entries()) {
      if (gid === gameId) {
        const timer = this.disconnectTimers.get(userId);
        if (timer) {
          clearTimeout(timer);
          this.disconnectTimers.delete(userId);
        }
        this.userGameMap.delete(userId);
      }
    }

    this.server.to(gameId).emit('gameOver', result);
    this.logger.log(`Emitted gameOver for game: ${gameId}`);
  }
}
