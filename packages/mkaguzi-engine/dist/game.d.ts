import { BoardState } from './board-state.js';
import { Move } from './move.js';
import { GameStatus, GameType, PlayerColor, Winner, EndReason } from './constants.js';
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
    private _reversibleMoveCount;
    private _threeKingsMoveCount;
    private _endgameMoveCount;
    constructor(id: string, whitePlayerId: string, blackPlayerId: string | null, gameType: GameType, whiteElo?: number | null, blackElo?: number | null, aiLevel?: number | null, initialTimeMs?: number, clockInfo?: {
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
    get reversibleMoveCount(): number;
    get threeKingsMoveCount(): number;
    get endgameMoveCount(): number;
    getMoveCount(): number;
    isGameOver(): boolean;
    start(): void;
    applyMove(move: Move): void;
    private updateDrawCounters;
    endGame(winner: Winner, reason: EndReason): void;
    canAcceptMove(): boolean;
    toString(): string;
}
//# sourceMappingURL=game.d.ts.map