// ─── Engine initialisation ────────────────────────────────────────────────
export { initEngine, isEngineReady } from './wasm-bridge.js';

// ─── Main engine API ──────────────────────────────────────────────────────
export { MkaguziEngine } from './engine.js';
export type { GameResult } from './engine.js';

// ─── Value objects ────────────────────────────────────────────────────────
export { Position } from './position.js';
export { Piece } from './piece.js';
export { BoardState } from './board-state.js';

// ─── Entities ─────────────────────────────────────────────────────────────
export { Move } from './move.js';
export { Game } from './game.js';

// ─── Services ─────────────────────────────────────────────────────────────
export {
  CaptureFindingService,
  MoveGeneratorService,
  MoveValidationService,
  GameRulesService,
} from './services.js';
export type { CapturePath, Direction } from './services.js';

// ─── Constants ────────────────────────────────────────────────────────────
export {
  GameStatus,
  GameType,
  PlayerColor,
  Winner,
  EndReason,
  PieceType,
  BOARD_SIZE,
  TOTAL_SQUARES,
  PIECES_PER_PLAYER,
  AI_DIFFICULTY_LEVELS,
  TimeControlType,
  DEFAULT_TIME_CONTROLS,
  RULE_VERSION,
  DEFAULT_ELO_RATING,
} from './constants.js';

// ─── FEN utilities (for hooks that build FEN strings) ─────────────────────
export { appFenToMkaguziFen } from './wasm-bridge.js';

// ─── Async search (off main thread) ───────────────────────────────────────
export { wasmSearch } from './wasm-bridge.js';
export type { RawSearchResult } from './wasm-bridge.js';
