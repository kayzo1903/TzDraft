import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { KallistoEngineService } from '../engines/kallisto-engine.service';
import { EgtbService } from '../engines/egtb.service';
import { MakeMoveUseCase } from './make-move.use-case';
import { GameStateCacheService } from '../services/game-state-cache.service';
export declare class BotMoveUseCase {
    private readonly gameRepository;
    private readonly kallistoService;
    private readonly egtbService;
    private readonly makeMoveUseCase;
    private readonly gameStateCache;
    constructor(gameRepository: IGameRepository, kallistoService: KallistoEngineService, egtbService: EgtbService, makeMoveUseCase: MakeMoveUseCase, gameStateCache: GameStateCacheService);
    execute(gameId: string): Promise<void>;
    private getBotColor;
    private timeLimitForLevel;
}
