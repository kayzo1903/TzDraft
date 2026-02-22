import { BoardState } from '../value-objects/board-state.vo';
import { Move } from './move.entity';
import {
  GameStatus,
  GameType,
  PlayerColor,
  Winner,
  EndReason,
  RULE_VERSION,
} from '../../../shared/constants/game.constants';

/**
 * Game Entity (Aggregate Root)
 * Represents a complete game of Tanzania Drafti
 */
export class Game {
  private _status: GameStatus;
  private _board: BoardState;
  private _moves: Move[];
  private _currentTurn: PlayerColor;
  private _winner: Winner | null;
  private _endReason: EndReason | null;
  private _startedAt: Date | null;
  private _endedAt: Date | null;

  constructor(
    public readonly id: string,
    public readonly whitePlayerId: string,
    public readonly blackPlayerId: string | null,
    public readonly gameType: GameType,
    public readonly whiteElo: number | null = null,
    public readonly blackElo: number | null = null,
    public readonly aiLevel: number | null = null,
    public readonly initialTimeMs: number = 600000, // Default 10 mins
    public readonly clockInfo?: {
      whiteTimeMs: number;
      blackTimeMs: number;
      lastMoveAt: Date;
    },
    public readonly createdAt: Date = new Date(),
    startedAt: Date | null = null,
    endedAt: Date | null = null,
    status: GameStatus = GameStatus.WAITING,
    winner: Winner | null = null,
    endReason: EndReason | null = null,
    currentTurn: PlayerColor = PlayerColor.WHITE,
  ) {
    this._status = status;
    this._board = BoardState.createInitialBoard();
    this._moves = [];
    this._currentTurn = currentTurn;
    this._winner = winner;
    this._endReason = endReason;
    this._startedAt = startedAt;
    this._endedAt = endedAt;
  }

  // Getters
  get status(): GameStatus {
    return this._status;
  }

  get board(): BoardState {
    return this._board;
  }

  get moves(): Move[] {
    return [...this._moves];
  }

  get currentTurn(): PlayerColor {
    return this._currentTurn;
  }

  get winner(): Winner | null {
    return this._winner;
  }

  get endReason(): EndReason | null {
    return this._endReason;
  }

  get startedAt(): Date | null {
    return this._startedAt;
  }

  get endedAt(): Date | null {
    return this._endedAt;
  }

  get ruleVersion(): string {
    return RULE_VERSION;
  }

  /**
   * Start the game
   */
  start(): void {
    if (this._status !== GameStatus.WAITING) {
      throw new Error('Game has already started');
    }
    this._status = GameStatus.ACTIVE;
    this._startedAt = new Date();
  }

  /**
   * Apply a move to the game
   */
  applyMove(move: Move): void {
    if (this._status !== GameStatus.ACTIVE) {
      throw new Error('Game is not active');
    }

    if (move.player !== this._currentTurn) {
      throw new Error("Not this player's turn");
    }

    // Update board state
    this._board = this._board.movePiece(move.from, move.to);

    // Remove captured pieces
    move.capturedSquares.forEach((capturedPos) => {
      this._board = this._board.removePiece(capturedPos);
    });

    // Add move to history
    this._moves.push(move);

    // Switch turn
    this._currentTurn =
      this._currentTurn === PlayerColor.WHITE
        ? PlayerColor.BLACK
        : PlayerColor.WHITE;
  }

  /**
   * End the game with a winner and reason
   */
  endGame(winner: Winner, reason: EndReason): void {
    if (this._status === GameStatus.FINISHED) {
      throw new Error('Game is already finished');
    }

    this._status = GameStatus.FINISHED;
    this._winner = winner;
    this._endReason = reason;
  }

  /**
   * Resign the game
   */
  resign(player: PlayerColor): void {
    const winner = player === PlayerColor.WHITE ? Winner.BLACK : Winner.WHITE;
    this.endGame(winner, EndReason.RESIGN);
  }

  /**
   * Abort the game
   */
  abort(): void {
    this._status = GameStatus.ABORTED;
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return (
      this._status === GameStatus.FINISHED ||
      this._status === GameStatus.ABORTED
    );
  }

  /**
   * Check if it's a specific player's turn
   */
  isPlayerTurn(player: PlayerColor): boolean {
    return this._currentTurn === player && this._status === GameStatus.ACTIVE;
  }

  /**
   * Get move count
   */
  getMoveCount(): number {
    return this._moves.length;
  }

  /**
   * Get last move
   */
  getLastMove(): Move | null {
    return this._moves.length > 0 ? this._moves[this._moves.length - 1] : null;
  }

  get clock(): any {
    // TODO: Implement clock value object
    return {
      initialTimeMs: this.initialTimeMs,
    };
  }

  /**
   * Check if game is PvE (Player vs AI)
   */
  isPvE(): boolean {
    return this.gameType === GameType.AI;
  }

  /**
   * Check if game is PvP (Player vs Player)
   */
  isPvP(): boolean {
    return (
      this.gameType === GameType.RANKED || this.gameType === GameType.CASUAL
    );
  }

  toString(): string {
    return `Game ${this.id}: ${this._status} - ${this._currentTurn} to move`;
  }
}
