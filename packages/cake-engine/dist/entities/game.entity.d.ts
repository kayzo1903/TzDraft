import { BoardState } from '../value-objects/board-state.vo';
import { Move } from './move.entity';
import { GameStatus, GameType, PlayerColor, Winner, EndReason } from '../constants';
/**
 * Game Entity (Aggregate Root)
 * Represents a complete game of Tanzania Drafti
 */
export declare class Game {
    readonly id: string;
    readonly whitePlayerId: string;
    readonly blackPlayerId: string | null;
    readonly gameType: GameType;
    readonly whiteElo: number | null;
    readonly blackElo: number | null;
    readonly aiLevel: number | null;
    readonly initialTimeMs: number;
    readonly clockInfo?: {
        whiteTimeMs: number;
        blackTimeMs: number;
        lastMoveAt: Date;
    } | undefined;
    readonly createdAt: Date;
    private _status;
    private _board;
    private _moves;
    private _currentTurn;
    private _winner;
    private _endReason;
    private _startedAt;
    private _endedAt;
    constructor(id: string, whitePlayerId: string, blackPlayerId: string | null, gameType: GameType, whiteElo?: number | null, blackElo?: number | null, aiLevel?: number | null, initialTimeMs?: number, // Default 10 mins
    clockInfo?: {
        whiteTimeMs: number;
        blackTimeMs: number;
        lastMoveAt: Date;
    } | undefined, createdAt?: Date, startedAt?: Date | null, endedAt?: Date | null, status?: GameStatus, winner?: Winner | null, endReason?: EndReason | null, currentTurn?: PlayerColor);
    get status(): GameStatus;
    get board(): BoardState;
    get moves(): Move[];
    get currentTurn(): PlayerColor;
    get winner(): Winner | null;
    get endReason(): EndReason | null;
    get startedAt(): Date | null;
    get endedAt(): Date | null;
    get ruleVersion(): string;
    /**
     * Start the game
     */
    start(): void;
    /**
     * Get move count
     */
    getMoveCount(): number;
    /**
     * Check if game is over
     */
    isGameOver(): boolean;
    /**
     * Apply a move to the game
     */
    applyMove(move: Move): void;
    /**
     * End the game
     */
    endGame(winner: Winner, reason: EndReason): void;
    /**
     * Check if game can accept moves
     */
    canAcceptMove(): boolean;
    toString(): string;
}
//# sourceMappingURL=game.entity.d.ts.map