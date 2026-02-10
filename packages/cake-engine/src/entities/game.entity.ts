import { BoardState } from '../value-objects/board-state.vo';
import { Move } from './move.entity';
import {
  GameStatus,
  GameType,
  PlayerColor,
  Winner,
  EndReason,
  RULE_VERSION,
} from '../constants';

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
   * Get move count
   */
  getMoveCount(): number {
    return this._moves.length;
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this._status === GameStatus.FINISHED;
  }

  /**
   * Apply a move to the game
   */
  applyMove(move: Move): void {
    if (this._status !== GameStatus.ACTIVE) {
      throw new Error('Game is not active');
    }

    if (move.player !== this._currentTurn) {
      throw new Error(`It is not ${move.player}'s turn`);
    }

    // Remove captured pieces
    let newBoard = this._board;
    for (const capturedPos of move.capturedSquares) {
      newBoard = newBoard.removePiece(capturedPos);
    }

    // Move the piece
    newBoard = newBoard.movePiece(move.from, move.to);

    // Update game state
    this._moves.push(move);
    this._board = newBoard;
    this._currentTurn =
      this._currentTurn === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
  }

  /**
   * End the game
   */
  endGame(winner: Winner, reason: EndReason): void {
    if (this._status === GameStatus.FINISHED) {
      throw new Error('Game has already finished');
    }

    this._status = GameStatus.FINISHED;
    this._winner = winner;
    this._endReason = reason;
    this._endedAt = new Date();
  }

  /**
   * Check if game can accept moves
   */
  canAcceptMove(): boolean {
    return this._status === GameStatus.ACTIVE && !this.isGameOver();
  }

  toString(): string {
    return `Game ${this.id} (${this.gameType}): ${this._status}`;
  }
}
