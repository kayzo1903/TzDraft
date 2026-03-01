import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ModuleRef } from '@nestjs/core';
export declare class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly moduleRef;
    server: Server;
    private logger;
    private pendingDrawOffers;
    private pendingRematchOffers;
    private userGameMap;
    private disconnectTimers;
    constructor(moduleRef: ModuleRef);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinGame(gameId: string, client: Socket): {
        status: string;
        message: string;
    };
    handleMakeMove(data: {
        gameId: string;
        from: number;
        to: number;
    }, client: Socket): Promise<{
        error?: string;
    }>;
    handleOfferDraw(data: {
        gameId: string;
    }, client: Socket): Promise<{
        error?: string;
    }>;
    handleAcceptDraw(data: {
        gameId: string;
    }, client: Socket): Promise<{
        error?: string;
    }>;
    handleDeclineDraw(data: {
        gameId: string;
    }, client: Socket): {
        error?: string;
    };
    handleCancelDraw(data: {
        gameId: string;
    }, client: Socket): {
        error?: string;
    };
    handleOfferRematch(data: {
        gameId: string;
    }, client: Socket): {
        error?: string;
    };
    handleAcceptRematch(data: {
        gameId: string;
    }, client: Socket): Promise<{
        error?: string;
    }>;
    handleDeclineRematch(data: {
        gameId: string;
    }, client: Socket): {
        error?: string;
    };
    handleCancelRematch(data: {
        gameId: string;
    }, client: Socket): {
        error?: string;
    };
    emitGameStateUpdate(gameId: string, gameState: any): void;
    emitGameOver(gameId: string, result: any): void;
}
