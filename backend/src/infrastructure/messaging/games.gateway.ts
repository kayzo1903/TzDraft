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
/** Tick interval for broadcasting abandon countdown to opponent. */
const ABANDON_TICK_MS = 1_000;

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

  /**
   * Interval handles for per-second countdown ticks: userId → setInterval handle.
   */
  private disconnectTickIntervals = new Map<
    string,
    ReturnType<typeof setInterval>
  >();
  /**
   * Number of currently connected sockets per user.
   * Prevents false "abandon" when one of multiple sockets disconnects.
   */
  private userConnectionCounts = new Map<string, number>();

  /**
   * Maps userId → most-recently-connected socketId.
   * Used to deliver matchFound to a player whose socket may have
   * reconnected after they joined the matchmaking queue.
   */
  private userSocketMap = new Map<string, string>();

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
      const existingConnections = this.userConnectionCounts.get(payload.sub) ?? 0;
      this.userConnectionCounts.set(payload.sub, existingConnections + 1);
      // Always track the latest socket so matchFound reaches reconnected clients
      this.userSocketMap.set(payload.sub, client.id);
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

    const existingConnections = this.userConnectionCounts.get(userId) ?? 0;
    const remainingConnections = Math.max(0, existingConnections - 1);
    if (remainingConnections === 0) {
      this.userConnectionCounts.delete(userId);
      this.userSocketMap.delete(userId);
    } else {
      this.userConnectionCounts.set(userId, remainingConnections);
      // User still has another active socket (e.g. refresh/multi-tab).
      // Do not start abandonment flow.
      return;
    }

    const gameId = this.userGameMap.get(userId);
    if (!gameId) return;

    // Avoid orphan timers/intervals when disconnect happens repeatedly.
    const existingTimer = this.disconnectTimers.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.disconnectTimers.delete(userId);
    }
    const existingTick = this.disconnectTickIntervals.get(userId);
    if (existingTick) {
      clearInterval(existingTick);
      this.disconnectTickIntervals.delete(userId);
    }

    // Notify the opponent immediately with the full grace-period duration
    this.server.to(gameId).emit('opponentDisconnected', {
      userId,
      secondsRemaining: Math.round(ABANDON_TIMEOUT_MS / 1000),
    });

    // Per-second countdown ticks so the frontend countdown is accurate
    let secondsLeft = Math.round(ABANDON_TIMEOUT_MS / 1000);
    const tickInterval = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        this.server
          .to(gameId)
          .emit('opponentDisconnectCountdown', {
            userId,
            secondsRemaining: secondsLeft,
          });
      } else {
        clearInterval(tickInterval);
        this.disconnectTickIntervals.delete(userId);
      }
    }, ABANDON_TICK_MS);
    this.disconnectTickIntervals.set(userId, tickInterval);

    // Start abandonment timer — auto-resign if they don't reconnect in time
    const timer = setTimeout(async () => {
      this.disconnectTimers.delete(userId);
      this.userGameMap.delete(userId);

      // Clear the tick interval if it somehow survived
      const tick = this.disconnectTickIntervals.get(userId);
      if (tick) {
        clearInterval(tick);
        this.disconnectTickIntervals.delete(userId);
      }

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
      // Cancel any pending abandonment timer + countdown ticks (player reconnected)
      const existingTimer = this.disconnectTimers.get(userId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.disconnectTimers.delete(userId);
        // Also cancel tick interval
        const existingTick = this.disconnectTickIntervals.get(userId);
        if (existingTick) {
          clearInterval(existingTick);
          this.disconnectTickIntervals.delete(userId);
        }
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
    if (offeredBy === userId)
      return { error: 'Cannot accept your own rematch offer' };

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
    this.server
      .to(data.gameId)
      .emit('rematchDeclined', { declinedByUserId: userId });
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

  /* ── Voice chat signaling (WebRTC P2P relay) ─────────────────────────── */

  /**
   * Guard used by all voice signaling handlers.
   * Returns true only when the authenticated user has joined the specified game room.
   * Prevents relay-abuse from users outside the room.
   */
  private isInRoom(client: Socket, gameId: string): boolean {
    const userId = client.data.user?.id;
    return !!userId && this.userGameMap.get(userId) === gameId;
  }

  /** Notify opponent that a call is incoming — they must accept before WebRTC starts. */
  @SubscribeMessage('voice:ring')
  handleVoiceRing(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (!this.isInRoom(client, data.gameId)) return;
    client.to(data.gameId).emit('voice:ring', {});
  }

  /** Callee accepted — tell the caller to now create and send the offer. */
  @SubscribeMessage('voice:accept')
  handleVoiceAccept(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (!this.isInRoom(client, data.gameId)) return;
    client.to(data.gameId).emit('voice:accept', {});
  }

  /** Callee declined — tell the caller the call was rejected. */
  @SubscribeMessage('voice:decline')
  handleVoiceDecline(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (!this.isInRoom(client, data.gameId)) return;
    client.to(data.gameId).emit('voice:decline', {});
  }

  /** Forward SDP offer to the opponent in the same game room. */
  @SubscribeMessage('voice:offer')
  handleVoiceOffer(
    @MessageBody() data: { gameId: string; sdp: any },
    @ConnectedSocket() client: Socket,
  ): void {
    if (!this.isInRoom(client, data.gameId)) return;
    client.to(data.gameId).emit('voice:offer', { sdp: data.sdp });
  }

  /** Forward SDP answer back to the caller. */
  @SubscribeMessage('voice:answer')
  handleVoiceAnswer(
    @MessageBody() data: { gameId: string; sdp: any },
    @ConnectedSocket() client: Socket,
  ): void {
    if (!this.isInRoom(client, data.gameId)) return;
    client.to(data.gameId).emit('voice:answer', { sdp: data.sdp });
  }

  /** Forward ICE candidate to the opponent. */
  @SubscribeMessage('voice:ice-candidate')
  handleVoiceIceCandidate(
    @MessageBody() data: { gameId: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ): void {
    if (!this.isInRoom(client, data.gameId)) return;
    client
      .to(data.gameId)
      .emit('voice:ice-candidate', { candidate: data.candidate });
  }

  /** Notify opponent that the call has ended. */
  @SubscribeMessage('voice:hangup')
  handleVoiceHangup(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (!this.isInRoom(client, data.gameId)) return;
    client.to(data.gameId).emit('voice:hangup', {});
  }

  /* ── Timeout claim ──────────────────────────────────────────────────── */

  /**
   * A player emits this when the opponent's clock they see on-screen reaches 0.
   * The server verifies the clock, ends the game, and broadcasts the result.
   */
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
        return {}; // Nothing to do
      }

      const clock = game.clockInfo as {
        whiteTimeMs: number;
        blackTimeMs: number;
        lastMoveAt: Date;
      } | null;

      if (!clock) return {};

      // Compute live remaining times on the server
      const now = Date.now();
      const elapsed = now - new Date(clock.lastMoveAt).getTime();
      const moveCount = game.getMoveCount ? game.getMoveCount() : 0;
      const activeIsWhite = moveCount % 2 === 0; // WHITE moves first
      const whiteMs = activeIsWhite
        ? Math.max(0, clock.whiteTimeMs - elapsed)
        : clock.whiteTimeMs;
      const blackMs = activeIsWhite
        ? clock.blackTimeMs
        : Math.max(0, clock.blackTimeMs - elapsed);

      // Only end the game if one of the clocks is genuinely at zero
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
    const socketId = this.userSocketMap.get(userId);
    if (!socketId) {
      this.logger.warn(`emitMatchFound: no live socket for user ${userId}, game ${gameId}`);
      return;
    }
    this.server.to(socketId).emit('matchFound', { gameId });
    this.logger.log(`Emitted matchFound to socket ${socketId} (user ${userId}) for game ${gameId}`);
  }

  emitGameStateUpdate(gameId: string, gameState: any) {
    this.server.to(gameId).emit('gameStateUpdated', gameState);
    this.logger.log(`Emitted gameStateUpdated for game: ${gameId}`);
  }

  emitGameOver(gameId: string, result: any) {
    // Clear any pending draw or rematch offers when the game ends
    this.pendingDrawOffers.delete(gameId);
    this.pendingRematchOffers.delete(gameId);

    // Cancel any abandonment timers + countdown ticks for players in this game
    for (const [userId, gid] of this.userGameMap.entries()) {
      if (gid === gameId) {
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
        this.userGameMap.delete(userId);
      }
    }

    this.server.to(gameId).emit('gameOver', result);
    this.logger.log(`Emitted gameOver for game: ${gameId}`);
  }
}
