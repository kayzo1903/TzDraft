import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import { MakeMoveUseCase } from '../../application/use-cases/make-move.use-case';
import { EndGameUseCase } from '../../application/use-cases/end-game.use-case';
import { CreateGameUseCase } from '../../application/use-cases/create-game.use-case';
import { JwtService } from '@nestjs/jwt';
import { GameStatus, GameType } from '../../shared/constants/game.constants';

/** Grace period in ms before an abandoned player is auto-resigned. */
const ABANDON_TIMEOUT_MS = 60_000;
/** Tick interval for broadcasting abandon countdown to opponent. */
const ABANDON_TICK_MS = 1_000;

/** WS rate limit: max move/draw/rematch events per socket per window. */
const WS_RATE_LIMIT = 30;
const WS_RATE_WINDOW_MS = 60_000;

// Redis key helpers
const K_DRAW = (gameId: string) => `ws:draw:offer:${gameId}`;
const K_REMATCH = (gameId: string) => `ws:rematch:offer:${gameId}`;
const K_USER_GAME = (userId: string) => `ws:user:game:${userId}`;
const K_USER_CONNS = (userId: string) => `ws:user:connections:${userId}`;
/** TTL (seconds) for transient WS keys — longer than any game duration. */
const KEY_TTL_S = 24 * 60 * 60; // 24 h

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  namespace: 'games',
})
@UseGuards(WsJwtGuard)
export class GamesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GamesGateway');

  /**
   * Active abandonment timers: userId → setTimeout handle.
   * These are process-local — they run on the instance where the socket
   * disconnected, which is always correct since disconnect is local.
   */
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private disconnectTickIntervals = new Map<
    string,
    ReturnType<typeof setInterval>
  >();

  /**
   * Per-socket event counter for WS rate limiting (process-local is fine —
   * sockets live on exactly one instance).
   */
  private wsRateCounts = new Map<
    string,
    { count: number; windowStart: number }
  >();

  /** ioredis clients dedicated to pub/sub for the Socket.IO adapter. */
  private pubClient: Redis;
  private subClient: Redis;

  constructor(private readonly moduleRef: ModuleRef) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────

  afterInit(server: Server) {
    const configService = this.moduleRef.get(ConfigService, { strict: false });
    const redisUrl = configService.get<string>('REDIS_URL');
    const isProd = configService.get<string>('NODE_ENV') === 'production';

    // Skip Redis adapter in development — single-process in-memory adapter is fine.
    // In production REDIS_URL is required, so the adapter always activates there.
    if (!isProd || !redisUrl) {
      this.logger.log('Socket.IO using in-memory adapter (development mode)');
      return;
    }

    this.pubClient = new Redis(redisUrl, { lazyConnect: false });
    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('error', (err) =>
      this.logger.error(`WS Redis pub error: ${err.message}`),
    );
    this.subClient.on('error', (err) =>
      this.logger.error(`WS Redis sub error: ${err.message}`),
    );

    // When a namespace is used, afterInit receives the Namespace object.
    // The adapter must be set on the root Server (namespace.server).
    const rootServer = (server as unknown as { server: Server }).server ?? server;
    rootServer.adapter(createAdapter(this.pubClient, this.subClient));
    this.logger.log('Socket.IO Redis adapter initialized');
  }

  handleConnection(client: Socket) {
    try {
      const jwtService = this.moduleRef.get(JwtService, { strict: false });
      const configService = this.moduleRef.get(ConfigService, {
        strict: false,
      });

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

      // Join personal room so emitMatchFound works cross-instance
      void client.join(`user:${payload.sub}`);

      // Track connection count in Redis (INCR is atomic, safe cross-instance)
      this.pubClient
        .incr(K_USER_CONNS(payload.sub))
        .then(() =>
          this.pubClient.expire(K_USER_CONNS(payload.sub), KEY_TTL_S),
        )
        .catch(() => {});

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch {
      this.logger.warn(`Socket ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    this.logger.log(
      `Client disconnected: ${client.id} (User: ${userId || 'unknown'})`,
    );

    this.wsRateCounts.delete(client.id);

    if (!userId) return;

    // Atomically decrement; if result > 0 the user still has other sockets
    const remaining = await this.pubClient.decr(K_USER_CONNS(userId));
    if (remaining > 0) return;

    // Last socket gone — clean up the counter key
    await this.pubClient.del(K_USER_CONNS(userId));

    const gameId = await this.pubClient.get(K_USER_GAME(userId));
    if (!gameId) return;

    // Clear any existing timer/tick for this user
    this.clearUserTimers(userId);

    this.server.to(gameId).emit('opponentDisconnected', {
      userId,
      secondsRemaining: Math.round(ABANDON_TIMEOUT_MS / 1000),
    });

    let secondsLeft = Math.round(ABANDON_TIMEOUT_MS / 1000);
    const tickInterval = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        this.server.to(gameId).emit('opponentDisconnectCountdown', {
          userId,
          secondsRemaining: secondsLeft,
        });
      } else {
        clearInterval(tickInterval);
        this.disconnectTickIntervals.delete(userId);
      }
    }, ABANDON_TICK_MS);
    this.disconnectTickIntervals.set(userId, tickInterval);

    const timer = setTimeout(async () => {
      this.disconnectTimers.delete(userId);
      this.clearUserTimers(userId);
      await this.pubClient.del(K_USER_GAME(userId));

      try {
        const repo = this.moduleRef.get<any>('IGameRepository', {
          strict: false,
        });
        const game = await repo.findById(gameId);

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
  async handleJoinGame(
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
      // Cancel any pending abandonment timer + tick (player reconnected)
      const wasDisconnected = this.disconnectTimers.has(userId);
      this.clearUserTimers(userId);
      if (wasDisconnected) {
        this.server.to(gameId).emit('opponentReconnected', { userId });
        this.logger.log(`User ${userId} reconnected to game ${gameId}`);
      }

      await this.pubClient.set(K_USER_GAME(userId), gameId, 'EX', KEY_TTL_S);
    }

    return { status: 'success', message: `Joined game ${gameId}` };
  }

  @SubscribeMessage('makeMove')
  async handleMakeMove(
    @MessageBody() data: { gameId: string; from: number; to: number },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };
    if (this.isWsRateLimited(client.id)) return { error: 'Too many requests' };

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

  @SubscribeMessage('offerDraw')
  async handleOfferDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const existing = await this.pubClient.get(K_DRAW(data.gameId));
    if (existing === userId) {
      return { error: 'You already have a pending draw offer' };
    }

    await this.pubClient.set(K_DRAW(data.gameId), userId, 'EX', KEY_TTL_S);
    this.logger.log(`Draw offered in game ${data.gameId} by ${userId}`);

    this.server.to(data.gameId).emit('drawOffered', {
      gameId: data.gameId,
      offeredByUserId: userId,
    });

    return {};
  }

  @SubscribeMessage('acceptDraw')
  async handleAcceptDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const offeredBy = await this.pubClient.get(K_DRAW(data.gameId));
    if (!offeredBy) return { error: 'No pending draw offer' };
    if (offeredBy === userId)
      return { error: 'Cannot accept your own draw offer' };

    await this.pubClient.del(K_DRAW(data.gameId));

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

  @SubscribeMessage('declineDraw')
  async handleDeclineDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const offeredBy = await this.pubClient.get(K_DRAW(data.gameId));
    if (!offeredBy) return { error: 'No pending draw offer' };
    if (offeredBy === userId)
      return { error: 'Cannot decline your own draw offer' };

    await this.pubClient.del(K_DRAW(data.gameId));
    this.logger.log(`Draw declined in game ${data.gameId} by ${userId}`);

    this.server.to(data.gameId).emit('drawDeclined', {
      gameId: data.gameId,
      declinedByUserId: userId,
    });

    return {};
  }

  @SubscribeMessage('cancelDraw')
  async handleCancelDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const offeredBy = await this.pubClient.get(K_DRAW(data.gameId));
    if (offeredBy !== userId) return { error: 'No draw offer to cancel' };

    await this.pubClient.del(K_DRAW(data.gameId));
    this.server.to(data.gameId).emit('drawCancelled', { gameId: data.gameId });
    return {};
  }

  /* ── Rematch flow ────────────────────────────────────────────────────── */

  @SubscribeMessage('offerRematch')
  async handleOfferRematch(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const existing = await this.pubClient.get(K_REMATCH(data.gameId));
    if (existing === userId) {
      return { error: 'You already offered a rematch' };
    }

    await this.pubClient.set(K_REMATCH(data.gameId), userId, 'EX', KEY_TTL_S);
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

    const offeredBy = await this.pubClient.get(K_REMATCH(data.gameId));
    if (!offeredBy) return { error: 'No pending rematch offer' };
    if (offeredBy === userId)
      return { error: 'Cannot accept your own rematch offer' };

    await this.pubClient.del(K_REMATCH(data.gameId));

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
  async handleDeclineRematch(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    await this.pubClient.del(K_REMATCH(data.gameId));
    this.server
      .to(data.gameId)
      .emit('rematchDeclined', { declinedByUserId: userId });
    return {};
  }

  @SubscribeMessage('cancelRematch')
  async handleCancelRematch(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const offeredBy = await this.pubClient.get(K_REMATCH(data.gameId));
    if (offeredBy !== userId) {
      return { error: 'No rematch offer to cancel' };
    }

    await this.pubClient.del(K_REMATCH(data.gameId));
    this.server.to(data.gameId).emit('rematchCancelled', {});
    return {};
  }

  /* ── Voice chat signaling (WebRTC P2P relay) ─────────────────────────── */

  private async isInRoom(client: Socket, gameId: string): Promise<boolean> {
    const userId = client.data.user?.id;
    if (!userId) return false;
    const storedGameId = await this.pubClient.get(K_USER_GAME(userId));
    return storedGameId === gameId;
  }

  @SubscribeMessage('voice:ring')
  async handleVoiceRing(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (!(await this.isInRoom(client, data.gameId))) return;
    client.to(data.gameId).emit('voice:ring', {});
  }

  @SubscribeMessage('voice:accept')
  async handleVoiceAccept(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (!(await this.isInRoom(client, data.gameId))) return;
    client.to(data.gameId).emit('voice:accept', {});
  }

  @SubscribeMessage('voice:decline')
  async handleVoiceDecline(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (!(await this.isInRoom(client, data.gameId))) return;
    client.to(data.gameId).emit('voice:decline', {});
  }

  @SubscribeMessage('voice:offer')
  async handleVoiceOffer(
    @MessageBody() data: { gameId: string; sdp: any },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (!(await this.isInRoom(client, data.gameId))) return;
    client.to(data.gameId).emit('voice:offer', { sdp: data.sdp });
  }

  @SubscribeMessage('voice:answer')
  async handleVoiceAnswer(
    @MessageBody() data: { gameId: string; sdp: any },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (!(await this.isInRoom(client, data.gameId))) return;
    client.to(data.gameId).emit('voice:answer', { sdp: data.sdp });
  }

  @SubscribeMessage('voice:ice-candidate')
  async handleVoiceIceCandidate(
    @MessageBody() data: { gameId: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (!(await this.isInRoom(client, data.gameId))) return;
    client
      .to(data.gameId)
      .emit('voice:ice-candidate', { candidate: data.candidate });
  }

  @SubscribeMessage('voice:hangup')
  async handleVoiceHangup(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    if (!(await this.isInRoom(client, data.gameId))) return;
    client.to(data.gameId).emit('voice:hangup', {});
  }

  /* ── Timeout claim ──────────────────────────────────────────────────── */

  @SubscribeMessage('claimTimeout')
  async handleClaimTimeout(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ error?: string }> {
    const userId = client.data.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    try {
      const repo = this.moduleRef.get<any>('IGameRepository', {
        strict: false,
      });
      const game = await repo.findById(data.gameId);

      if (
        !game ||
        game.status !== GameStatus.ACTIVE ||
        game.gameType === GameType.AI
      ) {
        return {};
      }

      const clock = game.clockInfo as {
        whiteTimeMs: number;
        blackTimeMs: number;
        lastMoveAt: Date;
      } | null;

      if (!clock) return {};

      const now = Date.now();
      const elapsed = now - new Date(clock.lastMoveAt).getTime();
      const moveCount = game.getMoveCount ? game.getMoveCount() : 0;
      const activeIsWhite = moveCount % 2 === 0;
      const whiteMs = activeIsWhite
        ? Math.max(0, clock.whiteTimeMs - elapsed)
        : clock.whiteTimeMs;
      const blackMs = activeIsWhite
        ? clock.blackTimeMs
        : Math.max(0, clock.blackTimeMs - elapsed);

      let timedOutPlayerId: string | null = null;
      let winner: string | null = null;

      if (whiteMs <= 0) {
        timedOutPlayerId = game.whitePlayerId;
        winner = 'BLACK';
      } else if (blackMs <= 0) {
        timedOutPlayerId = game.blackPlayerId;
        winner = 'WHITE';
      }

      if (!timedOutPlayerId || !winner) return {};

      const endGameUseCase = this.moduleRef.get(EndGameUseCase, {
        strict: false,
      });
      await endGameUseCase.timeout(data.gameId, timedOutPlayerId);
      this.emitGameOver(data.gameId, {
        gameId: data.gameId,
        winner,
        reason: 'timeout',
      });
      this.logger.log(
        `Timeout claimed for game ${data.gameId}: winner=${winner} (claimed by ${userId})`,
      );
      return {};
    } catch (err: any) {
      this.logger.error(`claimTimeout failed for game ${data.gameId}`, err);
      return { error: err?.message || 'Claim failed' };
    }
  }

  /* ── Emit helpers (called by application layer) ─────────────────────── */

  emitMatchFound(userId: string, gameId: string) {
    // Uses personal room `user:{userId}` — works cross-instance via Redis adapter
    this.server.to(`user:${userId}`).emit('matchFound', { gameId });
    this.logger.log(
      `Emitted matchFound to user room user:${userId} for game ${gameId}`,
    );
  }

  emitGameStateUpdate(gameId: string, gameState: any) {
    this.server.to(gameId).emit('gameStateUpdated', gameState);
    this.logger.log(`Emitted gameStateUpdated for game: ${gameId}`);
  }

  emitGameOver(gameId: string, result: any) {
    // Clear transient Redis keys for this game
    void this.pubClient.del(K_DRAW(gameId));
    void this.pubClient.del(K_REMATCH(gameId));

    // Cancel local disconnect timers for players in this game (best-effort)
    for (const [userId, timer] of this.disconnectTimers.entries()) {
      // We don't store the reverse gameId→userId mapping in Redis for timers,
      // so we clear all timers that belong to this game by checking Redis.
      this.pubClient.get(K_USER_GAME(userId)).then((gid) => {
        if (gid === gameId) {
          clearTimeout(timer);
          this.disconnectTimers.delete(userId);
          const tick = this.disconnectTickIntervals.get(userId);
          if (tick) {
            clearInterval(tick);
            this.disconnectTickIntervals.delete(userId);
          }
          void this.pubClient.del(K_USER_GAME(userId));
        }
      });
    }

    this.server.to(gameId).emit('gameOver', result);
    this.logger.log(`Emitted gameOver for game: ${gameId}`);
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  private isWsRateLimited(socketId: string): boolean {
    const now = Date.now();
    const entry = this.wsRateCounts.get(socketId);
    if (!entry || now - entry.windowStart > WS_RATE_WINDOW_MS) {
      this.wsRateCounts.set(socketId, { count: 1, windowStart: now });
      return false;
    }
    entry.count += 1;
    return entry.count > WS_RATE_LIMIT;
  }

  private clearUserTimers(userId: string): void {
    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
    }
    const tick = this.disconnectTickIntervals.get(userId);
    if (tick) {
      clearInterval(tick);
      this.disconnectTickIntervals.delete(userId);
    }
  }
}
