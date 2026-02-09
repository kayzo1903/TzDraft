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
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';

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

  handleConnection(client: Socket) {
    const userId = client.data.user?.id;
    this.logger.log(
      `Client connected: ${client.id} (User: ${userId || 'unknown'})`,
    );
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    this.logger.log(
      `Client disconnected: ${client.id} (User: ${userId || 'unknown'})`,
    );
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
