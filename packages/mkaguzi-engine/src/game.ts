import { BoardState } from './board-state.js';
import { Move } from './move.js';
import {
  GameStatus,
  GameType,
  PlayerColor,
  Winner,
  EndReason,
  RULE_VERSION,
} from './constants.js';

export class Game {
  private _status: GameStatus;
  private _board: BoardState;
  private _moves: Move[];
  private _currentTurn: PlayerColor;
  private _winner: Winner | null;
  private _endReason: EndReason | null;
  private _startedAt: Date | null;
  private _endedAt: Date | null;
  private _reversibleMoveCount: number = 0;
  private _threeKingsMoveCount: number = 0;
  private _endgameMoveCount: number = 0;

  constructor(
    public readonly id: string,
    public readonly whitePlayerId: string,
    public readonly blackPlayerId: string | null,
    public readonly gameType: GameType,
    public readonly whiteElo: number | null = null,
    public readonly blackElo: number | null = null,
    public readonly aiLevel: number | null = null,
    public readonly initialTimeMs: number = 600000,
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

  get status(): GameStatus { return this._status; }
  get board(): BoardState { return this._board; }
  get moves(): Move[] { return [...this._moves]; }
  get currentTurn(): PlayerColor { return this._currentTurn; }
  get winner(): Winner | null { return this._winner; }
  get endReason(): EndReason | null { return this._endReason; }
  get startedAt(): Date | null { return this._startedAt; }
  get endedAt(): Date | null { return this._endedAt; }
  get ruleVersion(): string { return RULE_VERSION; }
  get reversibleMoveCount(): number { return this._reversibleMoveCount; }
  get threeKingsMoveCount(): number { return this._threeKingsMoveCount; }
  get endgameMoveCount(): number { return this._endgameMoveCount; }

  getMoveCount(): number { return this._moves.length; }

  isGameOver(): boolean { return this._status === GameStatus.FINISHED; }

  start(): void {
    if (this._status !== GameStatus.WAITING) throw new Error('Game has already started');
    this._status = GameStatus.ACTIVE;
    this._startedAt = new Date();
  }

  applyMove(move: Move): void {
    if (this._status !== GameStatus.ACTIVE) throw new Error('Game is not active');
    if (move.player !== this._currentTurn) throw new Error(`It is not ${move.player}'s turn`);

    let newBoard = this._board;
    for (const capturedPos of move.capturedSquares) {
      newBoard = newBoard.removePiece(capturedPos);
    }
    newBoard = newBoard.movePiece(move.from, move.to);

    this._moves.push(move);
    this._board = newBoard;
    this.updateDrawCounters(move.player, move.capturedSquares.length > 0);
    this._currentTurn =
      this._currentTurn === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
  }

  private updateDrawCounters(movingPlayer: PlayerColor, wasCapture: boolean): void {
    const whitePieces = this._board.getPiecesByColor(PlayerColor.WHITE);
    const blackPieces = this._board.getPiecesByColor(PlayerColor.BLACK);
    const allPieces = [...whitePieces, ...blackPieces];
    const isKingsOnly = allPieces.length > 0 && allPieces.every((p) => p.isKing());

    if (!isKingsOnly || wasCapture) {
      this._reversibleMoveCount = 0;
    } else {
      this._reversibleMoveCount++;
    }

    const wKings = whitePieces.filter((p) => p.isKing()).length;
    const bKings = blackPieces.filter((p) => p.isKing()).length;
    const whiteIsStrong = wKings >= 3 && blackPieces.length === 1 && bKings === 1;
    const blackIsStrong = bKings >= 3 && whitePieces.length === 1 && wKings === 1;
    if (!whiteIsStrong && !blackIsStrong) {
      this._threeKingsMoveCount = 0;
    } else {
      const strongerSide = whiteIsStrong ? PlayerColor.WHITE : PlayerColor.BLACK;
      if (movingPlayer === strongerSide) {
        this._threeKingsMoveCount = wasCapture ? 0 : this._threeKingsMoveCount + 1;
      }
    }

    const wMen = whitePieces.length - wKings;
    const bMen = blackPieces.length - bKings;
    const isEndgame84 =
      (wKings === 1 && wMen === 0 && bKings === 1 && bMen === 0) ||
      (wKings === 1 && wMen === 1 && bKings === 1 && bMen === 0) ||
      (wKings === 1 && wMen === 0 && bKings === 1 && bMen === 1) ||
      (wKings === 2 && wMen === 0 && bKings === 1 && bMen === 0) ||
      (wKings === 1 && wMen === 0 && bKings === 2 && bMen === 0);
    if (!isEndgame84) {
      this._endgameMoveCount = 0;
    } else {
      this._endgameMoveCount++;
    }
  }

  endGame(winner: Winner, reason: EndReason): void {
    if (this._status === GameStatus.FINISHED) throw new Error('Game has already finished');
    this._status = GameStatus.FINISHED;
    this._winner = winner;
    this._endReason = reason;
    this._endedAt = new Date();
  }

  canAcceptMove(): boolean {
    return this._status === GameStatus.ACTIVE && !this.isGameOver();
  }

  toString(): string {
    return `Game ${this.id} (${this.gameType}): ${this._status}`;
  }
}
