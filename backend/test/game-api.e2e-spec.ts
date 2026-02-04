import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Game API (e2e)', () => {
  let app: INestApplication<App>;
  let createdGameId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /games/pvp - Create PvP Game', () => {
    it('should create a new ranked PvP game', async () => {
      const response = await request(app.getHttpServer())
        .post('/games/pvp')
        .send({
          whitePlayerId: 'player-001',
          blackPlayerId: 'player-002',
          whiteElo: 1400,
          blackElo: 1350,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.gameType).toBe('RANKED');
      expect(response.body.data._status).toBe('ACTIVE');
      expect(response.body.data._currentTurn).toBe('WHITE');
      expect(response.body.data.whitePlayerId).toBe('player-001');
      expect(response.body.data.blackPlayerId).toBe('player-002');

      // Store game ID for subsequent tests
      createdGameId = response.body.data.id;
    });

    it('should reject invalid player IDs', async () => {
      await request(app.getHttpServer())
        .post('/games/pvp')
        .send({
          whitePlayerId: '',
          blackPlayerId: 'player-002',
          whiteElo: 1400,
          blackElo: 1350,
        })
        .expect(400);
    });

    it('should reject invalid ELO ratings', async () => {
      await request(app.getHttpServer())
        .post('/games/pvp')
        .send({
          whitePlayerId: 'player-001',
          blackPlayerId: 'player-002',
          whiteElo: -100,
          blackElo: 1350,
        })
        .expect(400);
    });
  });

  describe('POST /games/pve - Create PvE Game', () => {
    it('should create a new AI game', async () => {
      const response = await request(app.getHttpServer())
        .post('/games/pve')
        .send({
          playerId: 'player-003',
          playerColor: 'WHITE',
          playerElo: 1200,
          aiLevel: 3,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.gameType).toBe('AI');
      expect(response.body.data.aiLevel).toBe(3);
      expect(response.body.data._status).toBe('ACTIVE');
    });

    it('should reject invalid AI level', async () => {
      await request(app.getHttpServer())
        .post('/games/pve')
        .send({
          playerId: 'player-003',
          playerColor: 'WHITE',
          playerElo: 1200,
          aiLevel: 10, // Invalid: must be 1-7
        })
        .expect(400);
    });

    it('should reject invalid player color', async () => {
      await request(app.getHttpServer())
        .post('/games/pve')
        .send({
          playerId: 'player-003',
          playerColor: 'INVALID',
          playerElo: 1200,
          aiLevel: 3,
        })
        .expect(400);
    });
  });

  describe('GET /games/:id - Get Game by ID', () => {
    it('should retrieve game details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/games/${createdGameId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game).toHaveProperty('id', createdGameId);
      expect(response.body.data.game._status).toBe('ACTIVE');
      expect(response.body.data.moves).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent game', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer()).get(`/games/${fakeId}`).expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer()).get('/games/invalid-uuid').expect(400);
    });
  });

  describe('GET /games/:id/state - Get Game State', () => {
    it('should retrieve game state with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/games/${createdGameId}/state`)
        .query({ skip: 0, take: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game).toHaveProperty('id', createdGameId);
      expect(response.body.data.moves).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('totalMoves');
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get(`/games/${createdGameId}/state`)
        .query({ skip: 0, take: 10 })
        .expect(200);

      expect(response.body.data.moves.length).toBeLessThanOrEqual(10);
    });
  });

  describe('POST /games/:gameId/moves - Make Move', () => {
    let testGameId: string;

    beforeEach(async () => {
      // Create a fresh game for move testing
      const response = await request(app.getHttpServer())
        .post('/games/pvp')
        .send({
          whitePlayerId: 'move-test-white',
          blackPlayerId: 'move-test-black',
          whiteElo: 1500,
          blackElo: 1500,
        });
      testGameId = response.body.data.id;
    });

    it('should make a valid opening move for white', async () => {
      const response = await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves`)
        .query({ playerId: 'move-test-white' })
        .send({
          from: 9,
          to: 13,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.move.player).toBe('WHITE');
      expect(response.body.data.move.from).toBe(9);
      expect(response.body.data.move.to).toBe(13);
      expect(response.body.data.move.notation).toBe('9-13');
      expect(response.body.data.game._currentTurn).toBe('BLACK');
    });

    it('should reject move when not player turn', async () => {
      // White's turn, but black tries to move
      await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves`)
        .query({ playerId: 'move-test-black' })
        .send({
          from: 21,
          to: 17,
        })
        .expect(400);
    });

    it('should reject invalid move (out of bounds)', async () => {
      await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves`)
        .query({ playerId: 'move-test-white' })
        .send({
          from: 9,
          to: 99, // Invalid position
        })
        .expect(400);
    });

    it('should reject move from empty square', async () => {
      await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves`)
        .query({ playerId: 'move-test-white' })
        .send({
          from: 16, // Empty square
          to: 20,
        })
        .expect(400);
    });

    it('should handle a sequence of moves', async () => {
      // Move 1: White
      await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves`)
        .query({ playerId: 'move-test-white' })
        .send({ from: 9, to: 13 })
        .expect(200);

      // Move 2: Black
      await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves`)
        .query({ playerId: 'move-test-black' })
        .send({ from: 21, to: 17 })
        .expect(200);

      // Move 3: White
      const response = await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves`)
        .query({ playerId: 'move-test-white' })
        .send({ from: 10, to: 14 })
        .expect(200);

      expect(response.body.data.move.moveNumber).toBe(3);
      expect(response.body.data.game._currentTurn).toBe('BLACK');
    });
  });

  describe('GET /games/:gameId/moves/legal - Get Legal Moves', () => {
    let testGameId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/games/pvp')
        .send({
          whitePlayerId: 'legal-test-white',
          blackPlayerId: 'legal-test-black',
          whiteElo: 1500,
          blackElo: 1500,
        });
      testGameId = response.body.data.id;
    });

    it('should return all legal moves for current player', async () => {
      const response = await request(app.getHttpServer())
        .get(`/games/${testGameId}/moves/legal`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check structure of legal moves
      response.body.data.forEach((move: any) => {
        expect(move).toHaveProperty('from');
        expect(move).toHaveProperty('to');
        expect(move).toHaveProperty('notation');
      });
    });

    it('should return legal moves for specific piece', async () => {
      const response = await request(app.getHttpServer())
        .get(`/games/${testGameId}/moves/legal/10`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);

      // All moves should be from position 10
      response.body.data.forEach((move: any) => {
        expect(move.from).toBe(10);
      });
    });

    it('should return empty array for piece with no legal moves', async () => {
      const response = await request(app.getHttpServer())
        .get(`/games/${testGameId}/moves/legal/1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      // Position 1 might have no moves in starting position
    });

    it('should return 400 for invalid position', async () => {
      await request(app.getHttpServer())
        .get(`/games/${testGameId}/moves/legal/99`)
        .expect(400);
    });
  });

  describe('POST /games/:gameId/moves/resign - Resign Game', () => {
    let testGameId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/games/pvp')
        .send({
          whitePlayerId: 'resign-test-white',
          blackPlayerId: 'resign-test-black',
          whiteElo: 1500,
          blackElo: 1500,
        });
      testGameId = response.body.data.id;
    });

    it('should allow player to resign', async () => {
      const response = await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves/resign`)
        .query({ playerId: 'resign-test-white' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('resigned');

      // Verify game is finished
      const gameState = await request(app.getHttpServer())
        .get(`/games/${testGameId}`)
        .expect(200);

      expect(gameState.body.data.game._status).toBe('FINISHED');
      expect(gameState.body.data.game._winner).toBe('BLACK');
      expect(gameState.body.data.game._endReason).toBe('RESIGNATION');
    });

    it('should not allow resignation of already finished game', async () => {
      // First resignation
      await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves/resign`)
        .query({ playerId: 'resign-test-white' })
        .expect(200);

      // Second resignation should fail
      await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves/resign`)
        .query({ playerId: 'resign-test-black' })
        .expect(400);
    });
  });

  describe('POST /games/:gameId/moves/draw - Draw by Agreement', () => {
    let testGameId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/games/pvp')
        .send({
          whitePlayerId: 'draw-test-white',
          blackPlayerId: 'draw-test-black',
          whiteElo: 1500,
          blackElo: 1500,
        });
      testGameId = response.body.data.id;
    });

    it('should end game in draw', async () => {
      const response = await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves/draw`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('draw');

      // Verify game is finished with draw
      const gameState = await request(app.getHttpServer())
        .get(`/games/${testGameId}`)
        .expect(200);

      expect(gameState.body.data.game._status).toBe('FINISHED');
      expect(gameState.body.data.game._winner).toBe('DRAW');
      expect(gameState.body.data.game._endReason).toBe('AGREEMENT');
    });
  });

  describe('POST /games/:gameId/moves/abort - Abort Game', () => {
    it('should abort game with no moves', async () => {
      // Create fresh game
      const createResponse = await request(app.getHttpServer())
        .post('/games/pvp')
        .send({
          whitePlayerId: 'abort-test-white',
          blackPlayerId: 'abort-test-black',
          whiteElo: 1500,
          blackElo: 1500,
        });
      const testGameId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves/abort`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('aborted');

      // Verify game is aborted
      const gameState = await request(app.getHttpServer())
        .get(`/games/${testGameId}`)
        .expect(200);

      expect(gameState.body.data.game._status).toBe('ABORTED');
    });

    it('should not allow abort after moves are made', async () => {
      // Create game and make a move
      const createResponse = await request(app.getHttpServer())
        .post('/games/pvp')
        .send({
          whitePlayerId: 'abort-test-white-2',
          blackPlayerId: 'abort-test-black-2',
          whiteElo: 1500,
          blackElo: 1500,
        });
      const testGameId = createResponse.body.data.id;

      // Make a move
      await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves`)
        .query({ playerId: 'abort-test-white-2' })
        .send({ from: 9, to: 13 })
        .expect(200);

      // Try to abort - should fail
      const response = await request(app.getHttpServer())
        .post(`/games/${testGameId}/moves/abort`)
        .expect(400);

      expect(response.body.message).toContain('Cannot abort');
    });
  });

  describe('Game Flow Integration Test', () => {
    it('should complete a full game flow', async () => {
      // 1. Create game
      const createResponse = await request(app.getHttpServer())
        .post('/games/pvp')
        .send({
          whitePlayerId: 'integration-white',
          blackPlayerId: 'integration-black',
          whiteElo: 1600,
          blackElo: 1550,
        })
        .expect(201);

      const gameId = createResponse.body.data.id;
      expect(createResponse.body.data._status).toBe('ACTIVE');

      // 2. Get initial legal moves
      const legalMovesResponse = await request(app.getHttpServer())
        .get(`/games/${gameId}/moves/legal`)
        .expect(200);

      expect(legalMovesResponse.body.data.length).toBeGreaterThan(0);

      // 3. Make opening moves
      await request(app.getHttpServer())
        .post(`/games/${gameId}/moves`)
        .query({ playerId: 'integration-white' })
        .send({ from: 11, to: 15 })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/games/${gameId}/moves`)
        .query({ playerId: 'integration-black' })
        .send({ from: 24, to: 20 })
        .expect(200);

      // 4. Check game state
      const stateResponse = await request(app.getHttpServer())
        .get(`/games/${gameId}/state`)
        .expect(200);

      expect(stateResponse.body.data.totalMoves).toBe(2);
      expect(stateResponse.body.data.game._currentTurn).toBe('WHITE');

      // 5. Get game details
      const gameResponse = await request(app.getHttpServer())
        .get(`/games/${gameId}`)
        .expect(200);

      expect(gameResponse.body.data.moves.length).toBe(2);
      expect(gameResponse.body.data.game._status).toBe('ACTIVE');
    });
  });
});
