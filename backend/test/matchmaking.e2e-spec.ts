import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as io from 'socket.io-client';
import { AppModule } from '../src/app.module';

describe('Matchmaking Gateway (E2E)', () => {
  let app: INestApplication;
  let clientSocket1: io.Socket;
  let clientSocket2: io.Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.listen(3002);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    if (clientSocket1) clientSocket1.close();
    if (clientSocket2) clientSocket2.close();
  });

  it('should match two guest players', (done) => {
    clientSocket1 = io.connect('http://localhost:3002/games', {
      transports: ['websocket'],
    });
    clientSocket2 = io.connect('http://localhost:3002/games', {
      transports: ['websocket'],
    });

    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        // Both connected, request match
        clientSocket1.emit('findMatch', {
          mode: 'CASUAL',
          guestName: 'Guest1',
        });
        clientSocket2.emit('findMatch', {
          mode: 'CASUAL',
          guestName: 'Guest2',
        });
      }
    };

    clientSocket1.on('connect', onConnect);
    clientSocket2.on('connect', onConnect);

    // Listen for game start
    let startCount = 0;
    const onGameStarted = (data: any) => {
      startCount++;
      expect(data).toHaveProperty('gameId');
      if (startCount === 2) {
        done();
      }
    };

    clientSocket1.on('gameStarted', onGameStarted);
    clientSocket2.on('gameStarted', onGameStarted);
  });
});
