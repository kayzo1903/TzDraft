# Production PvP Matchmaking Gap Analysis

**Date:** 2026-03-24
**Topic:** Quick Match (PVP) Online Matching Issues

This document outlines critical gaps and race conditions identified in the Quick Match (PVP Online) system. These bugs lead to parallel duplicate games being created, and "Ghost Games" where one player abandons the queue right as a match is made, forcing the opponent to wait up to the full time control.

## 1. The "Ghost Game" No-Show Bug (High Priority)

### Problem
* **Cause:** If Player A clicks "Cancel" (or the search times out due to `useMatchmaking.ts` 60s limit) exactly when the server makes a match, the frontend ignores the `matchFound` event or HTTP response because `cancelledRef.current` is true, keeping Player A in the UI's `idle` state. Player B, however, legitimately joins the game. Because Player A never fully connects to the WebSocket room (`joinGame`), the `handleDisconnect` logic fails to trigger an abort timer. Player B is stranded in an active game where Player A never moves, forcing Player B to endure the full game clock before being able to claim a timeout win.
* **Impact:** Terrible user experience for Player B.

### Proposed Fixes
1. **Frontend `useMatchmaking.ts`**: Modify the `handleMatchFound` WS listener and the `joinQueue` HTTP response parser. If a match is received but `cancelledRef.current` is true, immediately fire `gameService.abort(gameId)`.
2. **Backend "No-Show" Abort Timer (`JoinQueueUseCase.ts`)**: When `createMatchedGame` resolves, spawn a 30-second `setTimeout`. Upon timeout, check if the game still has `0` moves. If it does, automatically trigger the server `EndGameUseCase.abort()` and emit the `gameOver` event to the stranded opponent. This protects the system if the matched opponent closes the tab or loses internet.

## 2. The Prisma Symmetric Race Condition (Critical)

### Problem
* **Cause:** When two users join the queue at exactly the same time, they both run `findAndClaimMatch` (Step 7b) concurrently in `PrismaMatchmakingRepository`. Because it uses standard Postgres `READ COMMITTED` isolation for its transaction, Player A's transaction deletes Player B's queue row, while Player B's transaction deletes Player A's queue row. Both transactions succeed on different rows, resulting in *both* players creating a game with the other. This results in two parallel, duplicate active games for the same pair.
* **Impact:** System state corruption; users confused by two simultaneously launched game instances.

### Proposed Fixes
1. **Backend `PrismaMatchmakingRepository.ts`**: Add `isolationLevel: Prisma.TransactionIsolationLevel.Serializable` to the Prisma `$transaction` inside `findAndClaimMatch`. Serializability prevents the cross-deletion race condition. If both transactions attempt to mutually claim each other concurrently, one will fail with a serialization error (returning `null`, thus leaving the player gracefully in the queue), and exactly one game will be created.
