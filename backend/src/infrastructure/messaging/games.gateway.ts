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
import { GameType, PlayerColor } from '../../shared/constants/game.constants';
import { forwardRef, Inject } from '@nestjs/common';
import { EndGameUseCase } from '../../application/use-cases/end-game.use-case';
import { MakeMoveUseCase } from '../../application/use-cases/make-move.use-case';
import { BotMoveUseCase } from '../../application/use-cases/bot-move.use-case';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { CreateGameUseCase } from '../../application/use-cases/create-game.use-case';
import { PrismaService } from '../database/prisma/prisma.service';

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
  private readonly disconnectState = new Map<
    string,
    { gameId: string; playerId: string; deadlineMs: number }
  >();
  private readonly gameTimers = new Map<string, NodeJS.Timeout>();
  private readonly DISCONNECT_GRACE_MS = 60_000;
  private readonly drawOffers = new Map<
    string,
    { offeredBy: string; expiresAt: number; timer: NodeJS.Timeout }
  >();
  private readonly DRAW_OFFER_TTL_MS = 60_000;
  private readonly rematchRequests = new Map<
    string,
    { offeredBy: string; offeredTo: string; timer: NodeJS.Timeout }
  >();
  private readonly REMATCH_TTL_MS = 60_000;

  constructor(
    @Inject(forwardRef(() => MatchmakingService))
    private readonly matchmakingService: MatchmakingService,
    @Inject(forwardRef(() => EndGameUseCase))
    private readonly endGameUseCase: EndGameUseCase,
    @Inject(forwardRef(() => MakeMoveUseCase))
    private readonly makeMoveUseCase: MakeMoveUseCase,
    @Inject(forwardRef(() => BotMoveUseCase))
    private readonly botMoveUseCase: BotMoveUseCase,
    private readonly createGameUseCase: CreateGameUseCase,
    private readonly prisma: PrismaService,
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
  ) {}

  handleConnection(client: Socket) {
    const participantId = this.getSocketParticipantId(client);
    this.logger.log(
      `Client connected: ${client.id} (Participant: ${participantId || 'unknown'})`,
    );
    if (participantId) {
      this.clearDisconnectForfeit(participantId);
    }
  }

  handleDisconnect(client: Socket) {
    const participantId = this.getSocketParticipantId(client);
    this.logger.log(
      `Client disconnected: ${client.id} (Participant: ${participantId || 'unknown'})`,
    );
    this.matchmakingService.leaveQueue(client.id);

    if (participantId) {
      this.scheduleDisconnectForfeit(participantId);
    }
  }

  private clearDrawOffer(gameId: string) {
    const offer = this.drawOffers.get(gameId);
    if (!offer) return;
    clearTimeout(offer.timer);
    this.drawOffers.delete(gameId);
  }

  private clearRematchRequest(gameId: string) {
    const pending = this.rematchRequests.get(gameId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.rematchRequests.delete(gameId);
  }

  private async getSocketsByParticipant(participantId: string): Promise<any[]> {
    const sockets = await this.server.fetchSockets();
    return sockets.filter(
      (socket) => this.getSocketParticipantId(socket) === participantId,
    );
  }

  private async ensureParticipantRecord(
    participantId: string,
    guestName?: string | null,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id: participantId },
      select: { id: true },
    });
    if (existing) return;

    const token = participantId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const displayName = guestName?.trim() || `Guest-${token.slice(0, 8)}`;
    await this.prisma.user.create({
      data: {
        id: participantId,
        phoneNumber: `guest-${token}`,
        username: `guest_${token}`,
        displayName,
        passwordHash: null,
      },
    });
  }

  @SubscribeMessage('requestDraw')
  async handleRequestDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const participantId = this.getSocketParticipantId(client);
    if (!participantId) {
      return { status: 'error', message: 'Participant not identified' };
    }
    const gameId = data?.gameId;
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    try {
      const game = await this.gameRepository.findById(gameId);
      if (!game) return { status: 'error', message: 'Game not found' };
      if (
        game.whitePlayerId !== participantId &&
        game.blackPlayerId !== participantId
      ) {
        return { status: 'error', message: 'Player not in this game' };
      }
      if (game.status !== 'ACTIVE') {
        return { status: 'error', message: 'Game is not active' };
      }

      // Article 7.2 timing: draw offers are valid after your move
      // (i.e., when it is the opponent's turn).
      const offeringColor =
        game.whitePlayerId === participantId
          ? PlayerColor.WHITE
          : PlayerColor.BLACK;
      if (game.currentTurn === offeringColor) {
        return {
          status: 'error',
          message: 'Draw offer must be made after completing your move',
        };
      }

      const existing = this.drawOffers.get(gameId);
      if (existing) {
        if (existing.offeredBy === participantId) {
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

      this.drawOffers.set(gameId, {
        offeredBy: participantId,
        expiresAt,
        timer,
      });
      this.server.to(gameId).emit('drawOffered', {
        gameId,
        offeredBy: participantId,
        expiresAt,
      });
      return { status: 'success' };
    } catch (error: any) {
      this.logger.warn(
        `requestDraw failed game=${gameId} player=${participantId}`,
        error,
      );
      return { status: 'error', message: 'Failed to request draw' };
    }
  }

  @SubscribeMessage('respondDraw')
  async handleRespondDraw(
    @MessageBody() data: { gameId: string; accept: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const participantId = this.getSocketParticipantId(client);
    if (!participantId) {
      return { status: 'error', message: 'Participant not identified' };
    }
    const gameId = data?.gameId;
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    const offer = this.drawOffers.get(gameId);
    if (!offer) {
      return { status: 'error', message: 'No active draw offer' };
    }
    if (offer.offeredBy === participantId) {
      return { status: 'error', message: 'Cannot respond to your own draw offer' };
    }

    if (data.accept) {
      try {
        await this.endGameUseCase.drawByAgreement(gameId);
        this.clearDrawOffer(gameId);
        return { status: 'success' };
      } catch (error: any) {
        this.logger.warn(
          `respondDraw accept failed game=${gameId} player=${participantId}`,
          error,
        );
        return { status: 'error', message: 'Failed to accept draw' };
      }
    }

    this.clearDrawOffer(gameId);
    this.server.to(gameId).emit('drawDeclined', {
      gameId,
      declinedBy: participantId,
    });
    return { status: 'success' };
  }

  @SubscribeMessage('cancelDraw')
  async handleCancelDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const participantId = this.getSocketParticipantId(client);
    if (!participantId) {
      return { status: 'error', message: 'Participant not identified' };
    }
    const gameId = data?.gameId;
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    const offer = this.drawOffers.get(gameId);
    if (!offer) return { status: 'success' };
    if (offer.offeredBy !== participantId) {
      return { status: 'error', message: 'Only offerer can cancel' };
    }

    this.clearDrawOffer(gameId);
    this.server.to(gameId).emit('drawCancelled', {
      gameId,
      cancelledBy: participantId,
    });
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

    const participantId = this.getSocketParticipantId(client);
    if (participantId) {
      this.clearDisconnectForfeit(participantId);
    }
    client.join(gameId);
    this.logger.log(
      `Client ${client.id} (Participant: ${participantId}) joined game room: ${gameId}`,
    );

    // Tell the joining client which perspective to render from.
    // This avoids relying on fragile client-side sessionStorage when refreshing.
    if (participantId) {
      try {
        const game = await this.gameRepository.findById(gameId);
        const playerColor =
          game?.whitePlayerId === participantId
            ? 'WHITE'
            : game?.blackPlayerId === participantId
              ? 'BLACK'
              : null;

        if (playerColor) {
          client.emit('joinedGame', { gameId, playerColor });
        }

        const disconnectEntries = [...this.disconnectState.values()].filter(
          (entry) =>
            entry.gameId === gameId &&
            Date.now() < entry.deadlineMs &&
            entry.playerId !== participantId,
        );
        for (const entry of disconnectEntries) {
          client.emit('playerDisconnected', {
            gameId,
            playerId: entry.playerId,
            timeoutSec: Math.max(
              1,
              Math.ceil((entry.deadlineMs - Date.now()) / 1000),
            ),
            deadlineMs: entry.deadlineMs,
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to resolve playerColor for joinGame game=${gameId} player=${participantId}`,
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
    const participantId = this.getSocketParticipantId(client);
    if (!participantId) {
      return { status: 'error', message: 'Participant not identified' };
    }

    this.logger.log(
      `Make move request from ${participantId} in game ${data.gameId}: ${data.from} -> ${data.to}`,
    );

    try {
      const result = await this.makeMoveUseCase.execute(
        data.gameId,
        participantId,
        data.from,
        data.to,
      );

      // If this is a PvE game and the game is still active, trigger the bot
      // response asynchronously so the human gets the acknowledgement first.
      if (result.game.isPvE() && result.game.status === 'ACTIVE') {
        setImmediate(() => {
          this.botMoveUseCase.execute(data.gameId).catch((err) => {
            this.logger.error(
              `Bot move failed for game ${data.gameId}: ${err?.message}`,
            );
          });
        });
      }

      // Success - update strictly handled by UseCase via emitGameStateUpdate
      return { status: 'success' };
    } catch (error: any) {
      this.logger.error(`Move failed: ${error.message}`);
      client.emit('moveRejected', {
        gameId: data.gameId,
        from: data.from,
        to: data.to,
        message: error.message,
      });
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
    const participantId = this.getSocketParticipantId(client);
    if (participantId) {
      this.clearDisconnectForfeit(participantId);
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

    const joined = this.matchmakingService.joinQueue(
      client,
      gameMode,
      data.guestName,
    );
    if (!joined) {
      return {
        status: 'error',
        message: 'Unable to join queue: missing participant identity',
      };
    }
    return { status: 'success', message: 'Joined matchmaking queue' };
  }

  @SubscribeMessage('resignGame')
  async handleResignGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const participantId = this.getSocketParticipantId(client);
    const gameId = data?.gameId;
    if (!participantId) {
      return { status: 'error', message: 'Participant not identified' };
    }
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    try {
      await this.endGameUseCase.resign(gameId, participantId);
      return { status: 'success' };
    } catch (error: any) {
      this.logger.warn(
        `resignGame failed game=${gameId} player=${participantId}`,
        error,
      );
      return { status: 'error', message: error?.message || 'Failed to resign' };
    }
  }

  @SubscribeMessage('abortGame')
  async handleAbortGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const participantId = this.getSocketParticipantId(client);
    const gameId = data?.gameId;
    if (!participantId) {
      return { status: 'error', message: 'Participant not identified' };
    }
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    try {
      await this.endGameUseCase.abort(gameId, participantId);
      return { status: 'success' };
    } catch (error: any) {
      this.logger.warn(
        `abortGame failed game=${gameId} player=${participantId}`,
        error,
      );
      return { status: 'error', message: error?.message || 'Failed to abort' };
    }
  }

  @SubscribeMessage('cancelMatch')
  handleCancelMatch(@ConnectedSocket() client: Socket) {
    if (this.matchmakingService) {
      this.matchmakingService.leaveQueue(client.id);
      return { status: 'success', message: 'Left matchmaking queue' };
    }
    return { status: 'error', message: 'Matchmaking unavailable' };
  }

  @SubscribeMessage('requestRematch')
  async handleRequestRematch(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const participantId = this.getSocketParticipantId(client);
    if (!participantId) {
      return { status: 'error', message: 'Participant not identified' };
    }

    const gameId = data?.gameId;
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }

    const previousGame = await this.gameRepository.findById(gameId);
    if (!previousGame) {
      return { status: 'error', message: 'Game not found' };
    }
    if (previousGame.gameType === GameType.AI) {
      return { status: 'error', message: 'Rematch is only available for PvP games' };
    }
    if (previousGame.status !== 'FINISHED' && previousGame.status !== 'ABORTED') {
      return { status: 'error', message: 'Rematch is available after the game ends' };
    }
    if (
      previousGame.whitePlayerId !== participantId &&
      previousGame.blackPlayerId !== participantId
    ) {
      return { status: 'error', message: 'Player not in this game' };
    }

    const opponentId =
      previousGame.whitePlayerId === participantId
        ? previousGame.blackPlayerId
        : previousGame.whitePlayerId;
    if (!opponentId) {
      return { status: 'error', message: 'Opponent not found for rematch' };
    }

    const pending = this.rematchRequests.get(gameId);
    if (!pending) {
      const timer = setTimeout(() => {
        const stale = this.rematchRequests.get(gameId);
        if (!stale) return;
        this.rematchRequests.delete(gameId);
        this.server.to(gameId).emit('rematchExpired', { gameId });
      }, this.REMATCH_TTL_MS);

      this.rematchRequests.set(gameId, {
        offeredBy: participantId,
        offeredTo: opponentId,
        timer,
      });

      const opponentSockets = await this.getSocketsByParticipant(opponentId);
      for (const socket of opponentSockets) {
        socket.emit('rematchRequested', { gameId, offeredBy: participantId });
      }
      return { status: 'success', state: 'waiting' };
    }

    if (pending.offeredBy === participantId) {
      return { status: 'success', state: 'waiting' };
    }
    if (pending.offeredTo !== participantId) {
      return { status: 'error', message: 'Rematch request belongs to different players' };
    }

    this.clearRematchRequest(gameId);

    try {
      await Promise.all([
        previousGame.whitePlayerId
          ? this.ensureParticipantRecord(
              previousGame.whitePlayerId,
              previousGame.whiteGuestName,
            )
          : Promise.resolve(),
        previousGame.blackPlayerId
          ? this.ensureParticipantRecord(
              previousGame.blackPlayerId,
              previousGame.blackGuestName,
            )
          : Promise.resolve(),
      ]);

      const initialTimeMs = Math.max(
        1000,
        previousGame.initialTimeMs || 600000,
      );
      const rematchGame = await this.createGameUseCase.createPvPGame(
        previousGame.blackPlayerId,
        previousGame.whitePlayerId,
        previousGame.blackElo,
        previousGame.whiteElo,
        previousGame.blackGuestName || undefined,
        previousGame.whiteGuestName || undefined,
        previousGame.gameType,
        initialTimeMs,
      );

      const whiteId = rematchGame.whitePlayerId;
      const blackId = rematchGame.blackPlayerId;
      if (!whiteId || !blackId) {
        return { status: 'error', message: 'Failed to initialize rematch players' };
      }

      const [whiteSockets, blackSockets] = await Promise.all([
        this.getSocketsByParticipant(whiteId),
        this.getSocketsByParticipant(blackId),
      ]);

      for (const socket of whiteSockets) {
        socket.join(rematchGame.id);
        socket.emit('gameStarted', {
          gameId: rematchGame.id,
          whiteId,
          blackId,
          playerColor: 'WHITE',
        });
      }

      for (const socket of blackSockets) {
        socket.join(rematchGame.id);
        socket.emit('gameStarted', {
          gameId: rematchGame.id,
          whiteId,
          blackId,
          playerColor: 'BLACK',
        });
      }

      return { status: 'success', state: 'matched', gameId: rematchGame.id };
    } catch (error: any) {
      this.logger.error(
        `Failed to create rematch for game=${gameId} player=${participantId}`,
        error,
      );
      return { status: 'error', message: 'Failed to create rematch' };
    }
  }

  // Method to be called by the application layer
  emitGameStateUpdate(gameId: string, gameState: any) {
    this.server.to(gameId).emit('gameStateUpdated', gameState);
    this.logger.log(`Emitted gameStateUpdated for game: ${gameId}`);
  }

  emitGameOver(gameId: string, result: any) {
    this.clearGameTimer(gameId);
    this.server.to(gameId).emit('gameOver', result);
    this.logger.log(
      `Emitted gameOver for game: ${gameId} | reason=${result?.reason ?? 'UNKNOWN'} | winner=${result?.winner ?? 'null'} | endedBy=${result?.endedBy ?? 'n/a'} | noMoves=${result?.noMoves ?? 'n/a'}`,
    );
  }

  emitGameStart(gameId: string, players: string[]) {
    // Notify players via their socket IDs (joined to room)
    this.server.to(gameId).emit('gameStarted', { gameId });
    this.logger.log(`Emitted gameStarted for game: ${gameId}`);
  }

  async isParticipantOnline(participantId: string): Promise<boolean> {
    return this.hasConnectedSocket(participantId);
  }

  async getOnlineParticipantIds(participantIds: string[]): Promise<string[]> {
    const sockets = await this.server.fetchSockets();
    const onlineSet = new Set(
      sockets
        .map((socket) => this.getSocketParticipantId(socket))
        .filter((id): id is string => Boolean(id)),
    );
    return participantIds.filter((id) => onlineSet.has(id));
  }

  async emitToParticipant(
    participantId: string,
    event: string,
    payload: Record<string, any>,
  ) {
    const sockets = await this.getSocketsByParticipant(participantId);
    for (const socket of sockets) {
      socket.emit(event, payload);
    }
  }

  async notifyFriendlyMatchStarted(
    gameId: string,
    whiteId: string,
    blackId: string,
    inviteId?: string,
  ) {
    const [whiteSockets, blackSockets] = await Promise.all([
      this.getSocketsByParticipant(whiteId),
      this.getSocketsByParticipant(blackId),
    ]);

    for (const socket of whiteSockets) {
      socket.join(gameId);
      socket.emit('gameStarted', {
        gameId,
        whiteId,
        blackId,
        inviteId,
        playerColor: 'WHITE',
      });
    }

    for (const socket of blackSockets) {
      socket.join(gameId);
      socket.emit('gameStarted', {
        gameId,
        whiteId,
        blackId,
        inviteId,
        playerColor: 'BLACK',
      });
    }
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

  private async hasConnectedSocket(userId: string, roomId?: string): Promise<boolean> {
    const sockets = roomId
      ? await this.server.in(roomId).fetchSockets()
      : await this.server.fetchSockets();
    return sockets.some(
      (socket) => this.getSocketParticipantId(socket) === userId,
    );
  }

  private getSocketParticipantId(client: { data: any }): string | null {
    return client.data.user?.id || client.data.guestId || null;
  }

  private async scheduleDisconnectForfeit(userId: string) {
    // Guard against transient socket churn (refresh/reconnect/multi-tab):
    // only schedule forfeit when the user truly has no active socket.
    if (await this.hasConnectedSocket(userId)) {
      this.logger.log(
        `Skipping disconnect forfeit scheduling for user=${userId} (another socket is still connected)`,
      );
      return;
    }

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
      const connectedInGameRoom = await this.hasConnectedSocket(userId, game.id);
      if (connectedInGameRoom) {
        this.logger.log(
          `Skipping disconnect forfeit game=${game.id} user=${userId} (still connected in room)`,
        );
        continue;
      }

      const key = this.disconnectKey(game.id, userId);
      if (this.disconnectTimers.has(key)) continue;
      const deadlineMs = Date.now() + this.DISCONNECT_GRACE_MS;

      const timer = setTimeout(async () => {
        this.disconnectTimers.delete(key);
        this.disconnectState.delete(key);
        try {
          this.logger.warn(
            `Disconnect timer fired key=${key} game=${game.id} user=${userId}`,
          );
          const sockets = await this.server.in(game.id).fetchSockets();
          const reconnectedInRoom = sockets.some(
            (socket) => socket.data.user?.id === userId,
          );
          this.logger.log(
            `Disconnect timer check key=${key} game=${game.id} user=${userId} sockets=${sockets.length} reconnected=${reconnectedInRoom}`,
          );
          if (reconnectedInRoom) {
            this.server.to(game.id).emit('playerReconnected', {
              playerId: userId,
            });
            this.logger.log(
              `Disconnect forfeit skipped key=${key} game=${game.id} user=${userId} (user already reconnected)`,
            );
            return;
          }
          await this.endGameUseCase.disconnectForfeit(game.id, userId);
        } catch (error) {
          this.logger.error(
            `Disconnect forfeit failed for game=${game.id} user=${userId}`,
            error as any,
          );
        }
      }, this.DISCONNECT_GRACE_MS);

      this.disconnectTimers.set(key, timer);
      this.disconnectState.set(key, {
        gameId: game.id,
        playerId: userId,
        deadlineMs,
      });
      this.server.to(game.id).emit('playerDisconnected', {
        gameId: game.id,
        playerId: userId,
        timeoutSec: Math.floor(this.DISCONNECT_GRACE_MS / 1000),
        deadlineMs,
      });
      this.logger.warn(
        `Player ${userId} disconnected in game ${game.id}. key=${key} deadlineMs=${deadlineMs} timeoutMs=${this.DISCONNECT_GRACE_MS}`,
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
      this.disconnectState.delete(key);
      this.logger.log(
        `Disconnect timer cleared key=${key} game=${game.id} user=${userId}`,
      );
      this.server.to(game.id).emit('playerReconnected', {
        playerId: userId,
      });
      this.logger.log(
        `Player ${userId} reconnected in game ${game.id}. Disconnect forfeit cancelled.`,
      );
    }
  }
}
