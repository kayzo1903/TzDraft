# Phase 9: Local-First AI Game Implementation (Deferred)

> **Context**: This plan describes the "Option A" architecture for implementing AI games as strictly local (frontend-only) experiences. This work is deferred to a later phase.

## Goal

To conserve server resources and enable offline-capable practice, AI games will run entirely on the client-side (frontend). Database records will NOT be created for practice games.

## Architecture: Frontend-Only (Option A)

1.  **No Server Calls**: The game loop runs entirely in the browser.
2.  **No Database**: Game state is ephemeral (memory/local storage only).
3.  **No WebSockets**: Moves are instant function calls.

## Core Components to Port (Backend -> Frontend)

To support this, we must replicate the domain logic in TypeScript on the client, using a Shared Domain structure:

- **`src/domain/game/`**: Mirror of `backend/src/domain/game/`
  - `value-objects/`: `Position`, `Piece`, `BoardState`
  - `services/`: `MoveGeneratorService`, `CaptureFindingService` (Pure logic only)
  - `types/`: Shared types
  - `constants.ts`: Shared constants

## New Infrastructure Modules

- **`src/infrastructure/ai/bot.ts`**:
  - Implement `getBestMove(board, level, color)` function.
  - **Level 1-2**: Random valid moves.
  - **Level 3-5**: Basic heuristic (Material + Position).
  - **Level 6-7**: Minimax with Alpha-Beta pruning.

- **`src/hooks/useLocalGame.ts`**:
  - Manages `BoardState`, `Turn`, `History`, `Clock` locally.
  - Features: `makeMove`, `undo`, `reset`.

## UI / UX Changes

- **`setup-ai/page.tsx`**:
  - Determine if we redirect to `/game/local` or handle it in-place.
- **`game/local/page.tsx`**:
  - A clone of `game/[id]/page.tsx` but using `useLocalGame`.

## Verification Plan

1. **Setup**: Select Level 1, White, 5 min.
2. **Start**: Verify redirection/load of local game.
3. **Gameplay**: Verify moves, AI response, clock, and rules (captures/kings) work without network usage.
