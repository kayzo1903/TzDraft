# Drafti – Rule-Derived Test Cases

## 1. Purpose
This document defines **authoritative test cases** derived directly from the **Formal Tanzania Drafti (8×8) ruleset**.

It ensures:
- Domain model correctness
- Engine move translation accuracy
- Move validation integrity
- Clock & time control accuracy
- Realtime sync correctness

All test cases are **server-side** and **deterministic**.

---

## 2. Test Case Categories

1. **Piece Movement Tests**
2. **Capture Rules Tests**
3. **Multi-Capture & Max Capture Tests**
4. **Promotion Tests**
5. **Game End Tests**
6. **Clock & Time Control Tests**
7. **Engine Integration Tests**
8. **Realtime Sync Tests**

---

## 3. Sample Test Cases

### 3.1 Piece Movement Tests
- **TC-PM-01**: Man moves one square forward diagonally on empty board → valid
- **TC-PM-02**: Man moves backward diagonally without being king → invalid
- **TC-PM-03**: King moves any number of squares diagonally → valid
- **TC-PM-04**: King moves non-diagonally → invalid

### 3.2 Capture Rules Tests
- **TC-CAP-01**: Single capture available → non-capture move rejected
- **TC-CAP-02**: Capture move removes opponent piece → piece removed from board
- **TC-CAP-03**: Capture move lands on empty square → valid
- **TC-CAP-04**: Capture move lands on occupied square → invalid

### 3.3 Multi-Capture & Max Capture Tests
- **TC-MC-01**: Multi-capture sequence follows correct jumps → valid
- **TC-MC-02**: Partial multi-capture not including max number of captures → invalid
- **TC-MC-03**: Duplicate capture of same piece in multi-capture → invalid

### 3.4 Promotion Tests
- **TC-PROM-01**: Man reaches back row → promoted to King
- **TC-PROM-02**: Multi-capture ending in back row → promotion occurs after move completes
- **TC-PROM-03**: King remains King when reaching back row → valid

### 3.5 Game End Tests
- **TC-GE-01**: Opponent has no pieces → current player wins
- **TC-GE-02**: Opponent has no legal moves → current player wins
- **TC-GE-03**: Clock expires → current player loses
- **TC-GE-04**: Draw rules trigger correctly → game status set to DRAW

### 3.6 Clock & Time Control Tests
- **TC-CLOCK-01**: Standard clock deducts elapsed time correctly
- **TC-CLOCK-02**: Incremental clock adds increment after move
- **TC-CLOCK-03**: Delay clock deducts only after delay expires
- **TC-CLOCK-04**: Clock updates correctly in reconnection scenario

### 3.7 Engine Integration Tests
- **TC-ENG-01**: Engine suggested move validated by domain → accepted if legal
- **TC-ENG-02**: Engine suggested illegal move → rejected
- **TC-ENG-03**: Multi-capture engine move → validated fully
- **TC-ENG-04**: Engine move translation (CAKE ↔ Drafti) correct

### 3.8 Realtime Sync Tests
- **TC-WS-01**: MOVE_APPLIED broadcast updates all clients correctly
- **TC-WS-02**: MOVE_REJECTED message sent on invalid move
- **TC-WS-03**: GAME_STATE broadcast after reconnect reflects exact server state
- **TC-WS-04**: Clocks synchronized for all spectators

---

## 4. Test Case Attributes

- **id**: Unique test case identifier
- **description**: Short summary
- **preconditions**: Board & player state before test
- **actions**: Steps to perform
- **expected result**: Domain state after action
- **actual result**: To be filled by test execution

---

## 5. Test Execution Strategy

1. **Unit tests**: Piece movement, capture rules, promotion
2. **Integration tests**: Move validation + engine translation
3. **System tests**: Multiplayer + realtime sync + clocks
4. **Regression tests**: After rule changes or engine updates

---

## 6. Automation Recommendations

- Use **server-side testing framework** (e.g., Jest, Vitest)
- Seed board positions programmatically
- Mock WebSocket connections for realtime tests
- Include CI/CD pipeline

---

## 7. Summary

These test cases form a **complete rule-derived verification suite** for Drafti.

> Every move, clock tick, and engine suggestion is covered, ensuring fairness, correctness, and production readiness.

