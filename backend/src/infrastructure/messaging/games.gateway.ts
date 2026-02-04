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
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Allow all origins for now, can restrict later
  },
  namespace: 'games',
})
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GamesGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!gameId) {
      return { status: 'error', message: 'Game ID required' };
    }
    client.join(gameId);
    this.logger.log(`Client ${client.id} joined game room: ${gameId}`);
    return { status: 'success', message: `Joined game ${gameId}` };
  }

  // Method to be called by the application layer
  emitGameStateUpdate(gameId: string, gameState: any) {
    this.server.to(gameId).emit('gameStateUpdated', gameState);
    this.logger.log(`Emitted gameStateUpdated for game: ${gameId}`);
  }

  emitGameOver(gameId: string, result: any) {
    this.server.to(gameId).emit('gameOver', result);
    this.logger.log(`Emitted gameOver for game: ${gameId}`);
  }
}
