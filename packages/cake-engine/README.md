# CAKE Engine

**Framework-agnostic game engine for Tanzania Drafti 8×8 draughts**

Pure TypeScript, zero dependencies, browser & Node.js compatible.

## Installation

```bash
npm install @tzdraft/cake-engine
```

## Quick Start

```typescript
import { CakeEngine, PlayerColor } from '@tzdraft/cake-engine';

// Create initial board
const board = CakeEngine.createInitialState();

// Generate legal moves for white
const moves = CakeEngine.generateLegalMoves(board, PlayerColor.WHITE);

// Apply a move
const newBoard = CakeEngine.applyMove(board, moves[0]);

// Check for game end
const result = CakeEngine.evaluateGameResult(newBoard, PlayerColor.BLACK);
```

## Features

- ✅ Full Tanzania Drafti rules (8×8 board, 32 squares)
- ✅ Move validation & capture enforcement
- ✅ Piece promotion & king movement
- ✅ Game result detection (win/draw)
- ✅ Browser & Node.js compatible
- ✅ Zero runtime dependencies
- ✅ Fully type-safe TypeScript

## API

### `CakeEngine.createInitialState(): BoardState`

Creates the starting position for a new game.

### `CakeEngine.generateLegalMoves(state, player): Move[]`

Returns all legal moves for a player in the given position.

### `CakeEngine.applyMove(state, move): BoardState`

Applies a move to the board and returns the new state.

### `CakeEngine.evaluateGameResult(state, player): GameResult | null`

Detects if the game has ended (win, loss, draw).

## Documentation

- [Browser Compatibility Guide](./BROWSER_COMPAT.md)
- [Full API Reference](./docs/API.md)
- [Rule Specification](../../docs/README/formal_tanzania_drafti_rule_specification_8_x_8.md)

## Architecture

```
src/
├── constants.ts              # Game enums & config
├── value-objects/            # Position, Piece, BoardState
├── entities/                 # Game, Move
├── services/                 # Rules, validation, move generation
├── types/                    # Interfaces & types
├── engine.ts                 # Public API
└── index.ts                  # Exports
```

## License

MIT

