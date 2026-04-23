import { Injectable, Inject } from '@nestjs/common';
import type {
  IGameRepository,
  GameHistoryFilters,
} from '../../domain/game/repositories/game.repository.interface';
import { UserService } from '../../domain/user/user.service';
import { PlayerColor, Winner } from '../../shared/constants/game.constants';

export interface GameHistoryItem {
  id: string;
  gameType: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
  endReason: string | null;
  opponent: { id: string; displayName: string; username: string; elo: number | null } | null;
  myElo: number | null;
  moveCount: number;
  durationMs: number | null;
  playedAt: Date | null;
}

@Injectable()
export class GetGameHistoryUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
    private readonly userService: UserService,
  ) {}

  async execute(
    playerId: string,
    skip: number,
    take: number,
    filters?: GameHistoryFilters,
  ): Promise<{ items: GameHistoryItem[]; total: number }> {
    const { games, moveCounts, total } =
      await this.gameRepository.findCompletedGamesByPlayer(
        playerId,
        skip,
        take,
        filters,
      );

    // Batch-fetch all opponents in a single query
    const opponentIds = [
      ...new Set(
        games
          .map((g) =>
            g.whitePlayerId === playerId ? g.blackPlayerId : g.whitePlayerId,
          )
          .filter((id): id is string => !!id),
      ),
    ];
    const opponentUsers = await this.userService.findManyByIds(opponentIds);
    const opponentMap = new Map(opponentUsers.map((u) => [u.id, u]));

    const items = games.map((game, idx) => {
      const isWhite = game.whitePlayerId === playerId;
      const opponentId = isWhite ? game.blackPlayerId : game.whitePlayerId;
      const myElo = isWhite ? game.whiteElo : game.blackElo;
      const opponentElo = isWhite ? game.blackElo : game.whiteElo;

      let result: 'WIN' | 'LOSS' | 'DRAW';
      if (game.winner === Winner.DRAW) {
        result = 'DRAW';
      } else if (
        (isWhite && game.winner === Winner.WHITE) ||
        (!isWhite && game.winner === Winner.BLACK)
      ) {
        result = 'WIN';
      } else {
        result = 'LOSS';
      }

      let opponent: {
        id: string;
        displayName: string;
        username: string;
        elo: number | null;
      } | null = null;
      if (opponentId) {
        const user = opponentMap.get(opponentId);
        if (user) {
          opponent = {
            id: user.id,
            displayName: user.displayName,
            username: user.username,
            elo: opponentElo ?? (user as any).rating?.rating ?? null,
          };
        }
      }

      const moveCount = moveCounts[idx] ?? 0;
      const durationMs =
        game.startedAt && game.endedAt
          ? game.endedAt.getTime() - game.startedAt.getTime()
          : null;

      return {
        id: game.id,
        gameType: game.gameType,
        result,
        endReason: game.endReason ?? null,
        opponent,
        myElo: myElo ?? null,
        moveCount,
        durationMs,
        playedAt: game.endedAt ?? null,
      };
    });

    return { items, total };
  }
}
