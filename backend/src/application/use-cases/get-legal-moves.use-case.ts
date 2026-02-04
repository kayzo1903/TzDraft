import { Injectable, Inject } from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { MoveGeneratorService } from '../../domain/game/services/move-generator.service';
import { Move } from '../../domain/game/entities/move.entity';

/**
 * Get Legal Moves Use Case
 * Returns all legal moves for the current player
 */
@Injectable()
export class GetLegalMovesUseCase {
  private readonly moveGeneratorService: MoveGeneratorService;

  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
  ) {
    this.moveGeneratorService = new MoveGeneratorService();
  }

  /**
   * Get all legal moves for current player
   */
  async execute(gameId: string): Promise<Move[]> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    return this.moveGeneratorService.generateAllMoves(game, game.currentTurn);
  }

  /**
   * Get legal moves for a specific piece
   */
  async executeForPiece(gameId: string, position: number): Promise<Move[]> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const piece = game.board.getPieceAt({ value: position } as any);
    if (!piece) {
      return [];
    }

    return this.moveGeneratorService.generateMovesForPiece(game, piece);
  }
}
