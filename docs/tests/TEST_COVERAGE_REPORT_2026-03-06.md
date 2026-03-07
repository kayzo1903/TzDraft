# TzDraft — Test Coverage Report

**Date:** 2026-03-06
**Branch:** `production-Already-prep`
**Total tests:** 76 passing, 0 failing
**Test runner:** Jest 30 + ts-jest
**Command:** `pnpm test` (unit) · `pnpm test:cov` (with coverage)

---

## 1. Summary

| Suite | Tests | Status |
|---|---|---|
| `capture-finding.service.spec.ts` | 20 | ✅ Pass |
| `game-rules.service.spec.ts` | 22 | ✅ Pass |
| `move-validation.service.spec.ts` | 12 | ✅ Pass |
| `make-move.use-case.spec.ts` | 10 | ✅ Pass |
| `join-queue.use-case.spec.ts` | 12 | ✅ Pass |
| **Total** | **76** | **✅ All pass** |

---

## 2. Coverage by Area

### Core domain — game logic

| File | Lines | Branches | Functions | Statements |
|---|---|---|---|---|
| `capture-finding.service.ts` | **92%** | **90%** | 90% | 98% |
| `game-rules.service.ts` | **88%** | **82%** | 100% | 88% |
| `move-validation.service.ts` | **78%** | **75%** | 83% | 77% |
| `capture-path.type.ts` | **100%** | 100% | 100% | 100% |
| `validation-error.type.ts` | **100%** | 100% | 100% | 100% |

### Application use cases

| File | Lines | Branches | Functions | Statements |
|---|---|---|---|---|
| `make-move.use-case.ts` | **73%** | 63% | 50% | 74% |
| `join-queue.use-case.ts` | **84%** | 54% | 75% | 83% |

### Domain entities & value objects

| File | Lines | Branches | Functions | Statements |
|---|---|---|---|---|
| `game.entity.ts` | 66% | 30% | 61% | 66% |
| `move.entity.ts` | 84% | 100% | 50% | 83% |
| `board-state.vo.ts` | 79% | 46% | 78% | 79% |
| `piece.vo.ts` | 65% | 47% | 63% | 70% |
| `position.vo.ts` | 75% | 75% | 83% | 75% |

### Infrastructure (not yet tested — requires DB/process)

| Area | Lines |
|---|---|
| `prisma-game.repository.ts` | 0% |
| `prisma-move.repository.ts` | 0% |
| `games.gateway.ts` | 11% (covered via mocks in use-case tests) |
| `sidra.adapter.ts` | 0% |

### Overall

| Metric | Value | Target |
|---|---|---|
| All files — lines | **26%** | — |
| `domain/game` — lines | **~75%** | **80%** |
| `application/use-cases` — lines | **35%** | **80%** |

> Infrastructure files (repositories, gateways, adapters) require a live database and are intentionally excluded from unit test targets. The meaningful coverage target is `domain/` + `application/use-cases/`.

---

## 3. Test Files

### 3.1 `capture-finding.service.spec.ts`
**Location:** `backend/src/domain/game/services/`
**Purpose:** Verifies every TZD capture rule implemented in `CaptureFindingService`.

| Test | What it proves |
|---|---|
| Returns capture when man can jump forward | Basic forward capture works |
| Returns empty when no captures available | No false positives |
| Does NOT allow man to capture backward | Art 4.6 enforced |
| Collects captures from multiple pieces | All pieces scanned |
| Returns black captures | Symmetric for both players |
| Finds single forward capture | `findCapturesForPiece` baseline |
| Returns complete multi-capture path | Art 4.5: must continue, partial paths excluded |
| Stops chain at promotion | Art 4.10: promotion ends sequence immediately |
| Returns empty when no opponent | No crashes on empty board |
| Does not capture own pieces | Own-piece guard working |
| No piece captured twice in one chain | `capturedSoFar` guard working |
| Flying-king: multiple landing options | King slides any distance, lands at 27 or 32 |
| King does not capture own pieces | King own-piece guard |
| BLACK king captures | King symmetric for both colors |
| `hasCapturesAvailable` true | Positive case |
| `hasCapturesAvailable` false | Negative case |
| `hasCapturesAvailable` no pieces | Empty player case |
| `isValidCapture` matching capture | Returns true |
| `isValidCapture` wrong destination | Returns false |
| `isValidCapture` wrong captured square | Returns false |

### 3.2 `move-validation.service.spec.ts`
**Location:** `backend/src/domain/game/services/`
**Purpose:** Validates the 6-step move validation pipeline in `MoveValidationService`.

| Test | What it proves |
|---|---|
| Accepts valid forward-diagonal simple move | Happy path for non-capture |
| Rejects backward move for a man | TZD forward-only rule |
| Rejects move to occupied square | DESTINATION_OCCUPIED error |
| Accepts valid capture move | Happy path for capture |
| Enforces mandatory capture | CAPTURE_REQUIRED when capture exists |
| Correct newBoardState after capture | Piece moved + captured piece removed |
| Rejects invalid capture destination | Wrong landing rejected |
| Rejects move when game not active | GAME_NOT_ACTIVE error |
| Rejects move when wrong player's turn | WRONG_TURN error |
| Rejects move from empty square | NO_PIECE error |
| Rejects moving opponent's piece | WRONG_PIECE_COLOR error |
| Marks isPromotion on back-row simple move | Promotion flag set correctly |
| Does not mark isPromotion mid-board | No false promotion |

### 3.3 `game-rules.service.spec.ts`
**Location:** `backend/src/domain/game/services/`
**Purpose:** Verifies game-end detection, promotion logic, and all four draw rules.

| Test | What it proves |
|---|---|
| WHITE man on row 7 → shouldPromote=true | Art 3.3: WHITE promotion row |
| WHITE man not on row 7 → false | No premature promotion |
| BLACK man on row 0 → shouldPromote=true | Art 3.3: BLACK promotion row |
| BLACK man not on row 0 → false | No premature promotion |
| King → shouldPromote=false | Already-king guard |
| promotePiece creates a king | Promote method works |
| promotePiece on king returns king | Idempotent |
| hasLegalMoves: simple move available | Positive case |
| hasLegalMoves: capture available | Capture counts as legal |
| hasLegalMoves: blocked piece → false | Correctly trapped position |
| hasLegalMoves: no pieces → false | Empty player |
| isGameOver: active game → false | No false positives |
| isGameOver: FINISHED status → true | Status check |
| isGameOver: current player no pieces → true | Piece count check |
| isGameOver: player blocked → true | Legal-moves check |
| detectWinner: WHITE no pieces → BLACK | Winner detected |
| detectWinner: BLACK no pieces → WHITE | Winner detected |
| detectWinner: WHITE blocked → BLACK | Stalemate detected |
| detectWinner: both have moves → null | No premature game end |
| isDrawByInsufficientMaterial: K vs K → true | Art 8.1 |
| isDrawByInsufficientMaterial: man present → false | Not a draw |
| isDrawByInsufficientMaterial: 2K vs K → false | Art 8.1 boundary |
| isDrawByThirtyMoveRule: 60 → true | Art 8.3: 30-move rule |
| isDrawByThirtyMoveRule: 59 → false | Below threshold |
| isDrawByThreeKingsRule: 12 → true | Art 8.5 |
| isDrawByThreeKingsRule: 11 → false | Below threshold |
| isDrawByArticle84Endgame: 10 → true | Art 8.4 |
| isDrawByArticle84Endgame: 9 → false | Below threshold |
| countPieces returns correct counts | Utility method |
| endGame sets winner + FINISHED status | End game correctly |

### 3.4 `make-move.use-case.spec.ts`
**Location:** `backend/src/application/use-cases/`
**Purpose:** Verifies the full move execution pipeline — validation → apply → persist → WebSocket emit → game-end detection. All repositories and the gateway are mocked.

| Test | What it proves |
|---|---|
| Returns game + move on valid capture | Happy path end-to-end |
| Persists move + updates game in repo | DB writes called correctly |
| Emits gameStateUpdate WS event | WebSocket event fired |
| Assigns move number from DB count | Move numbering uses repository count |
| Throws when game not found | Null-game guard |
| Throws when player not in game | Player-guard check |
| Throws for invalid move | Validation errors propagate |
| Throws when capture is mandatory | Mandatory-capture propagates |
| Ends game when last piece captured | Game-over detection |
| Emits gameOver + updates ratings | End-game events + RatingService |
| Does not emit gameOver when game continues | No false game-end events |

### 3.5 `join-queue.use-case.spec.ts`
**Location:** `backend/src/application/use-cases/`
**Purpose:** Verifies matchmaking queue logic — join, match, Elo gap enforcement. Pre-existing file, maintained alongside new tests.

---

## 4. TZD Rules Verified by Tests

| Article | Rule | Test location |
|---|---|---|
| Art 3.3 | Promotion on opponent's back row | `game-rules.service.spec.ts` — `shouldPromote` |
| Art 4.5 | Men must continue capturing when further captures exist | `capture-finding.service.spec.ts` — multi-capture path |
| Art 4.6 | Men capture forward only | `capture-finding.service.spec.ts` — backward capture blocked |
| Art 4.9 | Free choice of capture sequence | `capture-finding.service.spec.ts` — flying king multiple landings |
| Art 4.10 | Promotion during capture ends sequence immediately | `capture-finding.service.spec.ts` — stops chain at promotion |
| Art 8.1 | K vs K = insufficient material draw | `game-rules.service.spec.ts` — `isDrawByInsufficientMaterial` |
| Art 8.3 | 30-move rule (60 half-moves, kings only, no captures) | `game-rules.service.spec.ts` — `isDrawByThirtyMoveRule` |
| Art 8.4 | K+Man vs K / 2K vs K draw after 5 full moves | `game-rules.service.spec.ts` — `isDrawByArticle84Endgame` |
| Art 8.5 | Three-kings rule: 3K vs K, 12 moves without capture | `game-rules.service.spec.ts` — `isDrawByThreeKingsRule` |
| — | Mandatory capture (capture if available) | `move-validation.service.spec.ts` — CAPTURE_REQUIRED |
| — | Flying king: slides any distance diagonally | `capture-finding.service.spec.ts` — king multiple landings |

---

## 5. How to Run

```bash
# All tests
cd backend
pnpm test

# With coverage report
pnpm test:cov

# Specific suite
pnpm test --testPathPatterns="capture-finding"

# Watch mode (re-runs on file save)
pnpm test:watch
```

CI runs automatically on every push to `main` and `production-Already-prep` via `.github/workflows/ci.yml`.

---

## 6. What Remains (Week 3 gaps)

| # | What | Files to create | Expected tests |
|---|---|---|---|
| W3.6 | CAKE engine move generation | `packages/cake-engine/src/**/*.spec.ts` | ~15 |
| W3.7 | Full game integration test (start → moves → end) | `backend/src/domain/game/game-integration.spec.ts` | ~5 |
| — | Value object unit tests (`Position`, `Piece`, `BoardState`) | `*.vo.spec.ts` | ~20 |
| — | `Game` entity tests (`applyMove`, draw counters, `replayMovesFromHistory`) | `game.entity.spec.ts` | ~15 |

Completing these would push `domain/game` from ~75% to >90% line coverage.

---

## 7. Coverage Thresholds (Recommended)

Add to `backend/package.json` under `"jest"` to fail CI if coverage regresses:

```json
"coverageThreshold": {
  "global": {
    "lines": 25
  },
  "./src/domain/game/services/": {
    "lines": 80
  }
}
```
