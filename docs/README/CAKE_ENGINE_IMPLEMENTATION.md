# CAKE Engine Implementation (Drafti)

**Last Updated:** 2026-02-10

## Purpose
This document describes how the CAKE engine is implemented and integrated in the Drafti monorepo. It is the single implementation reference for the browser-safe engine used by both frontend and backend.

## Location
- Package: `packages/cake-engine/`
- Source: `packages/cake-engine/src/`
- Build output: `packages/cake-engine/dist/`

## Public API (Engine)
File: `packages/cake-engine/src/engine.ts`

Exposed functions:
- `createInitialState()` → initial `BoardState`
- `generateLegalMoves(state, player, moveCount)` → legal `Move[]`
- `applyMove(state, move)` → new `BoardState`
- `evaluateGameResult(state, currentPlayer)` → winner/draw detection
- `createPosition(value)` and `createMove(...)` helpers

## Core Domain Model
Directory: `packages/cake-engine/src/value-objects/`

- `BoardState`: immutable board representation
- `Position`: 1–32 dark-square indexing with `toRowCol` and `fromRowCol`
- `Piece`: man/king, promotion rules, and movement helpers

Entities:
- `Move` in `packages/cake-engine/src/entities/move.entity.ts`

## Rules & Validation
Directory: `packages/cake-engine/src/services/`

- `CaptureFindingService`: finds all capture paths (including flying kings)
- `MoveGeneratorService`: generates legal moves
- `MoveValidationService`: validates move legality and enforces mandatory capture
- `GameRulesService`: promotion checks, win/draw rules, legal move checks

Current capture rule:
- If any capture is available, **capture is mandatory**
- Any capture route is legal (no max-capture filtering)

King capture rule:
- Kings are **flying** (can move/capture diagonally over distance)
- If a landing enables further capture, only extended paths are returned

## Frontend Integration
Local play uses CAKE directly:
- Hook: `frontend/src/hooks/useLocalGame.ts`
- Board UI: `frontend/src/components/game/Board.tsx`

LocalGame flow:
1. `CakeEngine.createInitialState()`
2. `CakeEngine.generateLegalMoves(...)`
3. Apply chosen move via `CakeEngine.applyMove(...)`
4. Check result via `CakeEngine.evaluateGameResult(...)`

## Backend Integration (Planned/Phased)
Backend is expected to import from `@tzdraft/cake-engine` and use the same services for move validation and AI move generation. This keeps rule parity across runtimes.

## Build & Usage
Build the package:
```
pnpm -C packages/cake-engine build
```

Consume in frontend:
```
import { CakeEngine } from "@tzdraft/cake-engine";
```

## Notes
- CAKE is browser-safe (no Node-only APIs).
- The engine is deterministic and stateless: all state lives in `BoardState`.
- Promotion, captures, and multi-capture sequences are fully enforced in the domain services.

