import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import {
  GameType,
  PlayerColor,
  GameStatus,
} from '../../shared/constants/game.constants';
import { randomUUID } from 'crypto';

/** Generate a random 6-char alphanumeric invite code */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create Game Use Case
 * Handles game creation for PvP and PvE modes
 */
@Injectable()
export class CreateGameUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
  ) {}

  /**
   * Create a new PvP game
   */
  async createPvPGame(
    whitePlayerId: string,
    blackPlayerId: string,
    whiteElo: number,
    blackElo: number,
  ): Promise<Game> {
    const game = new Game(
      randomUUID(),
      whitePlayerId,
      blackPlayerId,
      GameType.RANKED,
      whiteElo,
      blackElo,
      null,
      600000, // Default 10 mins for PvP for now (TODO: Add time selection for PvP)
      undefined,
    );

    game.start();
    return this.gameRepository.create(game);
  }

  /**
   * Create a new PvE game (Player vs AI)
   */
  async createPvEGame(
    playerId: string,
    playerColor: PlayerColor,
    playerElo: number,
    aiLevel: number,
    dto: { initialTimeMs?: number } = {},
  ): Promise<Game> {
    const whitePlayerId = playerColor === PlayerColor.WHITE ? playerId : 'AI';
    const blackPlayerId = playerColor === PlayerColor.BLACK ? playerId : 'AI';
    const whiteElo = playerColor === PlayerColor.WHITE ? playerElo : null;
    const blackElo = playerColor === PlayerColor.BLACK ? playerElo : null;

    const game = new Game(
      randomUUID(),
      whitePlayerId,
      blackPlayerId,
      GameType.AI,
      whiteElo,
      blackElo,
      aiLevel,
      dto.initialTimeMs || 600000,
      undefined, // clockInfo
    );

    game.start();
    // AI games are ephemeral — state is managed client-side; nothing is persisted.
    return game;
  }

  /**
   * Create an invite game (creator picks side; second slot is empty until join)
   */
  async createInviteGame(
    creatorId: string,
    creatorColor: PlayerColor,
    creatorElo: number,
    initialTimeMs: number,
  ): Promise<{ game: Game; inviteCode: string }> {
    // Abort any previous open invite games by this creator that no one joined yet.
    // This prevents the "expired code" problem where old WAITING games pile up.
    await this.gameRepository.expireStaleInvitesByPlayer(creatorId);

    const inviteCode = generateInviteCode();

    // Place creator in their chosen slot; the other stays null until joiner arrives.
    const whitePlayerId = creatorColor === PlayerColor.WHITE ? creatorId : null;
    const blackPlayerId = creatorColor === PlayerColor.BLACK ? creatorId : null;
    const whiteElo = creatorColor === PlayerColor.WHITE ? creatorElo : null;
    const blackElo = creatorColor === PlayerColor.BLACK ? creatorElo : null;

    const game = new Game(
      randomUUID(),
      whitePlayerId!, // schema now nullable; "!" silences TS on the entity type
      blackPlayerId,
      GameType.CASUAL,
      whiteElo,
      blackElo,
      null,
      initialTimeMs,
      undefined,
      new Date(),
      null,
      null,
      GameStatus.WAITING,
      null,         // winner
      null,         // endReason
      PlayerColor.WHITE, // currentTurn — WHITE always moves first
      inviteCode,
      creatorColor, // stored as dedicated field (not reused as currentTurn)
    );

    const created = await this.gameRepository.create(game);
    return { game: created, inviteCode };
  }

  /**
   * Join an invite game via code
   */
  async joinInviteGame(code: string, joinerId: string): Promise<Game> {
    const game = await this.gameRepository.findByInviteCode(code);
    if (!game) {
      throw new NotFoundException('Invite code not found');
    }
    if (game.status !== GameStatus.WAITING) {
      throw new BadRequestException('This game is no longer available');
    }
    if (game.whitePlayerId === joinerId || game.blackPlayerId === joinerId) {
      throw new BadRequestException('You cannot join your own game');
    }
    return this.gameRepository.joinInvite(game.id, joinerId);
  }

  /**
   * Transition a WAITING invite game (both slots filled) to ACTIVE.
   * Only the host (creator) may call this.
   */
  async startGame(gameId: string, requesterId: string): Promise<Game> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    if (game.status !== GameStatus.WAITING) {
      throw new BadRequestException('Game is not in WAITING status');
    }
    if (!game.whitePlayerId || !game.blackPlayerId) {
      throw new BadRequestException(
        'Game cannot start until both players have joined',
      );
    }
    // Derive the creator's ID from the stored creatorColor
    const creatorId =
      game.creatorColor === PlayerColor.WHITE
        ? game.whitePlayerId
        : game.blackPlayerId;
    if (creatorId !== requesterId) {
      throw new ForbiddenException('Only the game creator can start the game');
    }
    return this.gameRepository.startGame(gameId);
  }

  /**
   * Create a rematch for a finished game.
   * Colors are swapped: WHITE becomes BLACK and vice-versa.
   * The new game starts immediately (ACTIVE) with the same time control.
   */
  async createRematch(originalGameId: string): Promise<Game> {
    const original = await this.gameRepository.findById(originalGameId);
    if (!original) throw new NotFoundException('Original game not found');
    if (!original.blackPlayerId) {
      throw new BadRequestException('Cannot rematch a game that never started');
    }

    // Swap colours so each player gets the other side
    const newWhiteId = original.blackPlayerId;
    const newBlackId = original.whitePlayerId;

    const game = new Game(
      randomUUID(),
      newWhiteId,
      newBlackId,
      GameType.CASUAL,
      original.blackElo ?? 1200,
      original.whiteElo ?? 1200,
      null,
      original.initialTimeMs,
      undefined,
    );

    game.start();
    return this.gameRepository.create(game);
  }

  /**
   * Find game by ID
   */
  async findGameById(gameId: string): Promise<Game> {
    const game = await this.gameRepository.findById(gameId);

    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    return game;
  }
}
