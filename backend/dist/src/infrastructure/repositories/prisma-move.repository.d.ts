import { PrismaService } from '../database/prisma/prisma.service';
import { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { Move } from '../../domain/game/entities/move.entity';
export declare class PrismaMoveRepository implements IMoveRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(move: Move): Promise<Move>;
    findById(id: string): Promise<Move | null>;
    findByGameId(gameId: string): Promise<Move[]>;
    findByGameIdPaginated(gameId: string, skip: number, take: number): Promise<Move[]>;
    countByGameId(gameId: string): Promise<number>;
    getLastMove(gameId: string): Promise<Move | null>;
    deleteByGameId(gameId: string): Promise<void>;
    private toDomain;
}
