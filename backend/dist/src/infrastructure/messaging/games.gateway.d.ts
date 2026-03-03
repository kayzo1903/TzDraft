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
    private disconnectTickIntervals;
    private userConnectionCounts;
    private userSocketMap;
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
    private isInRoom;
    handleVoiceRing(data: {
        gameId: string;
    }, client: Socket): void;
    handleVoiceAccept(data: {
        gameId: string;
    }, client: Socket): void;
    handleVoiceDecline(data: {
        gameId: string;
    }, client: Socket): void;
    handleVoiceOffer(data: {
        gameId: string;
        sdp: any;
    }, client: Socket): void;
    handleVoiceAnswer(data: {
        gameId: string;
        sdp: any;
    }, client: Socket): void;
    handleVoiceIceCandidate(data: {
        gameId: string;
        candidate: any;
    }, client: Socket): void;
    handleVoiceHangup(data: {
        gameId: string;
    }, client: Socket): void;
    handleClaimTimeout(data: {
        gameId: string;
    }, client: Socket): Promise<{
        error?: string;
    }>;
    emitMatchFound(userId: string, gameId: string): void;
    emitGameStateUpdate(gameId: string, gameState: any): void;
    emitGameOver(gameId: string, result: any): void;
}
