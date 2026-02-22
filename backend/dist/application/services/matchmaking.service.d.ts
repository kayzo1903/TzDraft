import { CreateGameUseCase } from '../use-cases/create-game.use-case';
import { GameType } from '../../shared/constants/game.constants';
import { Socket } from 'socket.io';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
export declare class MatchmakingService {
    private readonly createGameUseCase;
    private readonly prisma;
    private readonly gamesGateway;
    private readonly logger;
    private queue;
    private interval;
    constructor(createGameUseCase: CreateGameUseCase, prisma: PrismaService, gamesGateway: GamesGateway);
    joinQueue(client: Socket, mode: GameType, guestName?: string): boolean;
    leaveQueue(socketId: string): void;
    private startMatchmakingLoop;
    private processQueue;
    private processSubQueue;
    private createGame;
    private ensureGuestParticipantRecord;
}
