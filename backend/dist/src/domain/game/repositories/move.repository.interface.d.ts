import { Move } from '../entities/move.entity';
export interface IMoveRepository {
    create(move: Move): Promise<Move>;
    findById(id: string): Promise<Move | null>;
    findByGameId(gameId: string): Promise<Move[]>;
    findByGameIdPaginated(gameId: string, skip: number, take: number): Promise<Move[]>;
    countByGameId(gameId: string): Promise<number>;
    getLastMove(gameId: string): Promise<Move | null>;
    deleteByGameId(gameId: string): Promise<void>;
}
