import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MatchmakingService } from '../../application/services/matchmaking.service';
import { EndGameUseCase } from '../../application/use-cases/end-game.use-case';
import { MakeMoveUseCase } from '../../application/use-cases/make-move.use-case';
import { BotMoveUseCase } from '../../application/use-cases/bot-move.use-case';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { CreateGameUseCase } from '../../application/use-cases/create-game.use-case';
import { PrismaService } from '../database/prisma/prisma.service';
export declare class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly matchmakingService;
    private readonly endGameUseCase;
    private readonly makeMoveUseCase;
    private readonly botMoveUseCase;
    private readonly createGameUseCase;
    private readonly prisma;
    private readonly gameRepository;
    server: Server;
    private logger;
    private readonly disconnectTimers;
    private readonly disconnectState;
    private readonly gameTimers;
    private readonly DISCONNECT_GRACE_MS;
    private readonly drawOffers;
    private readonly DRAW_OFFER_TTL_MS;
    private readonly rematchRequests;
    private readonly REMATCH_TTL_MS;
    private readonly readyStates;
    constructor(matchmakingService: MatchmakingService, endGameUseCase: EndGameUseCase, makeMoveUseCase: MakeMoveUseCase, botMoveUseCase: BotMoveUseCase, createGameUseCase: CreateGameUseCase, prisma: PrismaService, gameRepository: IGameRepository);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    private clearDrawOffer;
    private clearRematchRequest;
    private getSocketsByParticipant;
    private ensureParticipantRecord;
    handleRequestDraw(data: {
        gameId: string;
    }, client: Socket): Promise<{
        status: string;
        message: string;
    } | {
        status: string;
        message?: undefined;
    }>;
    handleRespondDraw(data: {
        gameId: string;
        accept: boolean;
    }, client: Socket): Promise<{
        status: string;
        message: string;
    } | {
        status: string;
        message?: undefined;
    }>;
    handleCancelDraw(data: {
        gameId: string;
    }, client: Socket): Promise<{
        status: string;
        message: string;
    } | {
        status: string;
        message?: undefined;
    }>;
    handleJoinWaitingRoom(data: {
        inviteId: string;
        displayName?: string;
    }, client: Socket): Promise<{
        status: string;
        message: string;
    } | {
        status: string;
        message?: undefined;
    }>;
    handleReadyForGame(data: {
        gameId: string;
        inviteId?: string;
    }, client: Socket): Promise<{
        status: string;
        message: string;
        gameId?: undefined;
        mode?: undefined;
        readyCount?: undefined;
    } | {
        status: string;
        gameId: string;
        message?: undefined;
        mode?: undefined;
        readyCount?: undefined;
    } | {
        status: string;
        mode: string;
        message?: undefined;
        gameId?: undefined;
        readyCount?: undefined;
    } | {
        status: string;
        readyCount: number;
        message?: undefined;
        gameId?: undefined;
        mode?: undefined;
    }>;
    handleJoinGame(payload: string | {
        gameId?: string;
    }, client: Socket): Promise<{
        status: string;
        message: string;
        playerColor?: undefined;
        participantId?: undefined;
    } | {
        status: string;
        message: string;
        playerColor: "WHITE" | "BLACK" | null;
        participantId: string | null;
    }>;
    handleMakeMove(data: {
        gameId: string;
        from: number;
        to: number;
    }, client: Socket): Promise<{
        status: string;
        message?: undefined;
    } | {
        status: string;
        message: any;
    }>;
    handleFindMatch(data: {
        mode: 'RANKED' | 'CASUAL';
        guestName?: string;
    }, client: Socket): {
        status: string;
        message: string;
    };
    handleResignGame(data: {
        gameId: string;
    }, client: Socket): Promise<{
        status: string;
        message?: undefined;
    } | {
        status: string;
        message: any;
    }>;
    handleAbortGame(data: {
        gameId: string;
    }, client: Socket): Promise<{
        status: string;
        message?: undefined;
    } | {
        status: string;
        message: any;
    }>;
    handleCancelMatch(client: Socket): {
        status: string;
        message: string;
    };
    handleRequestRematch(data: {
        gameId: string;
    }, client: Socket): Promise<{
        status: string;
        message: string;
        state?: undefined;
        gameId?: undefined;
    } | {
        status: string;
        state: string;
        message?: undefined;
        gameId?: undefined;
    } | {
        status: string;
        state: string;
        gameId: string;
        message?: undefined;
    }>;
    emitGameStateUpdate(gameId: string, gameState: any): void;
    emitMoveRollback(gameId: string, move: {
        from: number;
        to: number;
    }): void;
    emitGameOver(gameId: string, result: any): void;
    emitGameStart(gameId: string, players: string[]): void;
    isParticipantOnline(participantId: string): Promise<boolean>;
    getOnlineParticipantIds(participantIds: string[]): Promise<string[]>;
    emitToParticipant(participantId: string, event: string, payload: Record<string, any>): Promise<void>;
    notifyFriendlyMatchStarted(gameId: string, whiteId: string, blackId: string, inviteId?: string): Promise<void>;
    scheduleGameTimeout(gameId: string, durationMs: number, playerId: string): void;
    clearGameTimer(gameId: string): void;
    private disconnectKey;
    private emitDisconnectEventToParticipants;
    private emitReconnectedEventToParticipants;
    private hasConnectedSocket;
    private getSocketParticipantId;
    private scheduleDisconnectForfeit;
    private clearDisconnectForfeit;
}
