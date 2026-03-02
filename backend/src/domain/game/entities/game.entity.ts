import { BoardState } from '../value-objects/board-state.vo';
import { Move } from './move.entity';
import { Position } from '../value-objects/position.vo';
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

  // Draw-rule counters (reconstructed from move history on load)
  /** Half-moves where only kings present and no capture occurred (Art 8.3 30-move rule) */
  private _reversibleMoveCount: number = 0;
  /** Moves by the stronger side in 3+ kings vs 1 king position (Art 8.5 three-kings rule) */
  private _threeKingsMoveCount: number = 0;
  /** Half-moves since K vs K / K+Man vs K / 2K vs K endgame was established (Art 8.4) */
  private _endgameMoveCount: number = 0;

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
    public readonly inviteCode: string | null = null,
    public readonly creatorColor: PlayerColor | null = null,
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

    // Update draw-rule counters (board is now in its new state)
    this.updateDrawCounters(move.player, move.capturedSquares.length > 0);

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
    this._endedAt = new Date();
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

  get reversibleMoveCount(): number {
    return this._reversibleMoveCount;
  }
  get threeKingsMoveCount(): number {
    return this._threeKingsMoveCount;
  }
  get endgameMoveCount(): number {
    return this._endgameMoveCount;
  }

  /**
   * Update draw-rule counters after a half-move has been applied to the board.
   * Call AFTER the board is already in its new state.
   */
  private updateDrawCounters(
    movingPlayer: PlayerColor,
    wasCapture: boolean,
  ): void {
    const whitePieces = this._board.getPiecesByColor(PlayerColor.WHITE);
    const blackPieces = this._board.getPiecesByColor(PlayerColor.BLACK);
    const allPieces = [...whitePieces, ...blackPieces];
    const isKingsOnly =
      allPieces.length > 0 && allPieces.every((p) => p.isKing());

    // Art 8.3 — 30-move rule: kings only board, no captures
    if (!isKingsOnly || wasCapture) {
      this._reversibleMoveCount = 0;
    } else {
      this._reversibleMoveCount++;
    }

    // Art 8.5 — three-kings rule: stronger side (3+ kings) vs lone enemy king
    const wKings = whitePieces.filter((p) => p.isKing()).length;
    const bKings = blackPieces.filter((p) => p.isKing()).length;
    const whiteIsStrong =
      wKings >= 3 && blackPieces.length === 1 && bKings === 1;
    const blackIsStrong =
      bKings >= 3 && whitePieces.length === 1 && wKings === 1;

    if (!whiteIsStrong && !blackIsStrong) {
      this._threeKingsMoveCount = 0;
    } else {
      const strongerSide = whiteIsStrong
        ? PlayerColor.WHITE
        : PlayerColor.BLACK;
      if (movingPlayer === strongerSide) {
        this._threeKingsMoveCount = wasCapture
          ? 0
          : this._threeKingsMoveCount + 1;
      }
      // Weaker side's moves don't change the counter
    }

    // Art 8.4 — endgame draws: K vs K, K+Man vs K, 2K vs K → draw after 5 full moves (10 half-moves)
    const wMen = whitePieces.length - wKings;
    const bMen = blackPieces.length - bKings;
    const isEndgame84 =
      (wKings === 1 && wMen === 0 && bKings === 1 && bMen === 0) || // K vs K
      (wKings === 1 && wMen === 1 && bKings === 1 && bMen === 0) || // K+Man vs K
      (wKings === 1 && wMen === 0 && bKings === 1 && bMen === 1) || // K vs K+Man
      (wKings === 2 && wMen === 0 && bKings === 1 && bMen === 0) || // 2K vs K
      (wKings === 1 && wMen === 0 && bKings === 2 && bMen === 0); // K vs 2K

    if (!isEndgame84) {
      this._endgameMoveCount = 0;
    } else {
      this._endgameMoveCount++;
    }
  }

  /**
   * Replay raw Prisma move records to reconstruct the board state after loading
   * from the database.  We bypass applyMove's turn-guard because _currentTurn
   * has already been derived from moveCount and we don't need to re-add moves
   * to `_moves` (they were already counted for turn calculation).
   *
   * Each `rawMove` is a plain Prisma row with:
   *   fromSquare: number, toSquare: number, capturedSquares: number[]
   */
  replayMovesFromHistory(
    rawMoves: {
      id?: string;
      gameId?: string;
      moveNumber?: number;
      player?: PlayerColor;
      fromSquare: number;
      toSquare: number;
      capturedSquares: number[];
      isPromotion?: boolean;
      notation?: string;
      createdAt?: Date;
    }[],
  ): void {
    rawMoves.forEach((raw, idx) => {
      const from = new Position(raw.fromSquare);
      const to = new Position(raw.toSquare);

      // Remove captured pieces first
      for (const sq of raw.capturedSquares ?? []) {
        this._board = this._board.removePiece(new Position(sq));
      }

      // Move the piece (also handles promotion inside movePiece)
      this._board = this._board.movePiece(from, to);

      // Rebuild draw-rule counters (WHITE always moves first, then alternate)
      const movingPlayer =
        idx % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;
      const wasCapture = (raw.capturedSquares ?? []).length > 0;
      this.updateDrawCounters(movingPlayer, wasCapture);

      // Keep move history count in sync for rules that rely on getMoveCount().
      const captured = (raw.capturedSquares ?? []).map(
        (sq) => new Position(sq),
      );
      this._moves.push(
        new Move(
          raw.id ?? `replay-${this.id}-${idx + 1}`,
          raw.gameId ?? this.id,
          raw.moveNumber ?? idx + 1,
          raw.player ?? movingPlayer,
          from,
          to,
          captured,
          Boolean(raw.isPromotion),
          raw.notation ?? Move.generateNotation(from, to, captured),
          raw.createdAt ? new Date(raw.createdAt) : new Date(),
        ),
      );
    });
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

  /**
   * Controls JSON serialization. Without this, JSON.stringify only sees
   * own enumerable properties (the underscore-prefixed private fields),
   * so getters like `status`, `winner`, `currentTurn` are silently dropped.
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      whitePlayerId: this.whitePlayerId,
      blackPlayerId: this.blackPlayerId,
      gameType: this.gameType,
      whiteElo: this.whiteElo,
      blackElo: this.blackElo,
      aiLevel: this.aiLevel,
      initialTimeMs: this.initialTimeMs,
      clockInfo: this.clockInfo,
      createdAt: this.createdAt,
      inviteCode: this.inviteCode,
      creatorColor: this.creatorColor,
      status: this._status,
      winner: this._winner,
      endReason: this._endReason,
      currentTurn: this._currentTurn,
      startedAt: this._startedAt,
      endedAt: this._endedAt,
      ruleVersion: this.ruleVersion,
    };
  }
}
