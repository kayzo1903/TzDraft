import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinGame(gameId: string, client: Socket): {
        status: string;
        message: string;
    };
    emitGameStateUpdate(gameId: string, gameState: any): void;
    emitGameOver(gameId: string, result: any): void;
}
