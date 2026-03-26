# Mkaguzi-v0.1 Engine Plan

## 1. Purpose

`mkaguzi-v0.1` is our first fully owned draughts engine track for the TzDraft platform.

It is not meant to replace every existing engine on day one. Its first goal is narrower and more valuable:

- become a correct Tanzania-first analysis engine
- expose understandable engine output to the app
- give us full control over rules, evaluation, and future tuning
- create the foundation for later stronger versions without depending on external engine internals

Version `0.1` is therefore a correctness-and-foundation release, not a peak-strength release.

---

## 2. Product Position

### What Mkaguzi-v0.1 is

- a native engine we control end-to-end
- optimized first for Tanzania draughts rule fidelity
- designed to integrate cleanly with the TypeScript app
- able to return best move, principal variation, and eval breakdown

### What Mkaguzi-v0.1 is not

- not a final replacement for stronger mature engines yet
- not an opening-book-heavy or tablebase-heavy release
- not a "win by Elo immediately" project

### Honest target for v0.1

If `Sidra` is currently our practical medium engine, then `mkaguzi-v0.1` should initially aim to be:

- more transparent than Sidra
- easier to adapt than Sidra
- more Tanzania-specific than Sidra
- easier to connect to our analysis UI than Sidra

Raw playing strength can improve after the core is stable.

---

## 3. Vision

Long term, `mkaguzi` should become the platform's primary owned engine family:

- `mkaguzi-v0.1`: correctness, search foundation, analysis protocol
- `mkaguzi-v0.2`: stronger evaluation, opening knowledge, better ordering
- `mkaguzi-v0.3`: tablebase support, tuning pipeline, stronger Multi-PV
- `mkaguzi-v1.0`: production-grade primary engine for analysis and computer play

---

## 4. Core Design Principles

1. Rule correctness before strength
2. Tanzania-first implementation
3. Rule changes isolated in one rule layer
4. Search layer stays variant-agnostic
5. Engine output must be explainable to the UI
6. Make/unmake only inside search, no per-node cloning
7. Perft and regression tests are mandatory before tuning

---

## 5. Mkaguzi-v0.1 Scope

### In scope

- 32-square bitboard board model
- Tanzania rules as the primary variant
- optional Russian variant hooks only where architecture requires it
- legal move generation
- mandatory capture handling
- majority-capture filtering if confirmed by official rule interpretation
- make/unmake
- Zobrist hashing
- repetition detection
- iterative deepening alpha-beta
- quiescence search on captures
- transposition table
- simple but structured evaluation
- JSON line protocol for app integration
- TypeScript adapter to stream search info
- perft tests
- eval regression tests

### Out of scope for v0.1

- full opening book
- full tablebase generation beyond stubs/interfaces
- null move pruning
- advanced LMR tuning
- aspiration tuning beyond basic support
- machine-learned pattern weights
- distributed self-play farm

---

## 6. Proposed Repo Placement

Mkaguzi should fit the current monorepo instead of creating a disconnected project.

### Engine source

```text
engines/
  mkaguzi/
    CMakeLists.txt
    README.md
    src/
    tests/
    tools/
```

### Documentation

```text
docs/
  README/
    MKAGUZI_V0_1_ENGINE_PLAN.md
    MKAGUZI_RULE_DECISIONS.md
    MKAGUZI_PROTOCOL_SPEC.md
```

### TypeScript integration

```text
apps/ or frontend/
  engine/
    MkaguziProcess.ts
    MkaguziManager.ts
    mkaguziMessages.ts
```

This keeps the owned engine beside `engines/sidra/` while preserving the current product structure.

---

## 7. Architecture

### 7.1 High-level modules

```text
mkaguzi
  core       -> types, constants, square maps, bitboard helpers
  rules      -> movegen, captures, promotion, repetition policy
  board      -> position, make/unmake, hashing
  search     -> iterative deepening, alpha-beta, qsearch, TT, ordering
  eval       -> material, tempo, mobility, structure, patterns
  protocol   -> stdin/stdout JSON IPC
  tests      -> perft, move legality, eval regression
```

### 7.2 Ownership boundaries

- `rules/` decides what is legal
- `board/` applies a legal move efficiently
- `search/` decides what is best
- `eval/` explains why a position is good or bad
- `protocol/` translates engine state to the app

---

## 8. Tanzania-First Rule Strategy

The engine must treat rule configuration as a first-class dependency.

### Mandatory rule decisions to freeze before deep implementation

1. Whether majority capture is truly mandatory in Tanzania play
2. Whether maximum capture is counted by pieces captured or by sequence priority
3. Whether promotion during a capture sequence ends the move immediately
4. Final notation standard for FEN/PDN or a platform-specific canonical equivalent

### Rule design policy

No rule detail should be hidden in search or UI code.

All rule-sensitive logic must flow through:

- `RuleConfig`
- capture generation
- promotion handling
- repetition policy
- notation parsing and serialization

---

## 9. Evaluation Strategy for v0.1

The first release should not try to be "smart everywhere." It should be stable and measurable.

### Evaluation terms for v0.1

- material
- side-to-move tempo
- mobility approximation
- back-rank integrity
- center control
- promotion threat
- isolated advanced man penalty
- king centrality

### Evaluation policy

- start with small weights and few features
- every new term must have a regression test position
- avoid expensive pattern systems until baseline speed is known

### Eval trace support

The engine should be able to return:

- material
- mobility
- structure
- patterns
- king safety
- tempo
- endgame
- total

That makes `mkaguzi` more useful in the app than a black-box engine.

---

## 10. Search Strategy for v0.1

### Required search features

1. iterative deepening
2. alpha-beta negamax
3. transposition table
4. TT move ordering
5. capture-first ordering
6. killer moves
7. history heuristic
8. quiescence search

### Deferred search features

- null move pruning
- advanced LMR
- aspiration window tuning
- singular extensions
- internal iterative reductions

### Why this matters

This gives us a serious engine foundation without taking on too much instability in the first owned release.

---

## 11. IPC and App Integration

`mkaguzi-v0.1` should be designed as an analysis service process from the beginning.

### Engine input

- `setVariant`
- `setPosition`
- `go`
- `stop`
- `probe`
- `evalTrace`

### Engine output

- `info`
- `bestmove`
- `probe`
- `evalTrace`
- `error`

### Integration goals

- easy process spawning from Node/TypeScript
- streamed search updates for the UI
- Multi-PV ready root reporting
- stable message schema shared between engine and app

---

## 12. Versioned Deliverables

## Phase 0: Rule Lock and Design Freeze

### Goal

Freeze rules and contracts so move generation does not get rewritten later.

### Deliverables

- `MKAGUZI_RULE_DECISIONS.md`
- `MKAGUZI_PROTOCOL_SPEC.md`
- confirmed square numbering policy
- confirmed move notation policy
- confirmed Tanzania capture policy

### Exit criteria

- no open rule ambiguity affecting move legality

---

## Phase 1: Core Board and Move Legality

### Goal

Make the engine produce exactly legal Tanzania moves.

### Deliverables

- `types.h`, `constants.h`
- square maps and directional lookup tables
- `Position`
- `Move`
- quiet move generation
- recursive capture generation
- majority-capture filtering if required
- promotion handling

### Tests

- perft positions depth 1 to 5
- hand-checked capture edge cases
- promotion edge cases

### Exit criteria

- perft matches references exactly

---

## Phase 2: Make/Unmake, Hashing, and Repetition

### Goal

Support efficient search without cloning positions.

### Deliverables

- `Undo`
- `makeMove`
- `unmakeMove`
- Zobrist hashing
- repetition tracker
- half-move counter logic

### Tests

- make/unmake round-trip tests
- hash consistency tests
- repetition-detection regression tests

### Exit criteria

- repeated make/unmake leaves position and hash unchanged

---

## Phase 3: Baseline Search

### Goal

Produce stable best moves with a basic but real search engine.

### Deliverables

- iterative deepening
- alpha-beta
- quiescence
- transposition table
- move ordering
- stop/time checks
- principal variation reporting

### Tests

- mate or forced-win tactical positions
- regression positions for search stability
- node-count sanity checks

### Exit criteria

- engine returns legal best moves under time and depth limits

---

## Phase 4: Evaluation v0.1

### Goal

Make the engine positionally sensible, not just tactically legal.

### Deliverables

- material evaluation
- tempo
- mobility
- basic structure terms
- king activity
- eval trace output

### Tests

- eval regression suite
- "preferred side" comparison positions

### Exit criteria

- self-play stops making obviously naive positional mistakes as often

---

## Phase 5: App Adapter and Analysis UI Wiring

### Goal

Make `mkaguzi` usable inside TzDraft for analysis and later play.

### Deliverables

- `MkaguziProcess.ts`
- `MkaguziManager.ts`
- typed message contracts
- `EvalBreakdown`
- `MultiPV` support
- engine status and error handling

### Tests

- process spawn integration tests
- malformed message handling
- UI display checks for PV and eval trace

### Exit criteria

- frontend can load a position and receive live search info

---

## Phase 6: Strengthening Track

### Goal

Improve strength only after the core is reliable.

### Deliverables

- refined move ordering
- opening book interface
- endgame probe interface
- pattern evaluation expansion
- tuning scripts
- self-play runner

### Exit criteria

- measurable improvement in gauntlet matches

---

## 13. Recommended v0.1 File Layout

```text
engines/mkaguzi/
  CMakeLists.txt
  README.md
  src/
    core/
      types.h
      constants.h
      bitboard.cpp
      square_map.cpp
    rules/
      variant.h
      movegen.cpp
      capturegen.cpp
      promotion.cpp
      repetition.cpp
    board/
      position.cpp
      makemove.cpp
      hash.cpp
    search/
      search.cpp
      qsearch.cpp
      ordering.cpp
      tt.cpp
      history.cpp
      killers.cpp
      time.cpp
    eval/
      eval.cpp
      material.cpp
      mobility.cpp
      structure.cpp
      patterns.cpp
      king_safety.cpp
      tempo.cpp
    protocol/
      ipc.cpp
      messages.h
    main.cpp
  tests/
    perft/
    eval/
    rules/
  tools/
    selfplay.cpp
    texel.py
```

---

## 14. Success Metrics for v0.1

`mkaguzi-v0.1` is successful if:

- move generation is rule-correct
- perft is trustworthy
- the app can analyze positions through JSON IPC
- evaluation breakdown is visible in UI
- the engine can play complete legal games without state corruption
- we can improve it without touching unrelated platform code

It is not necessary for `v0.1` to be our strongest engine.

---

## 15. Risks

### Risk 1: Rule ambiguity

If Tanzania capture and promotion details are not frozen early, we will rewrite move generation repeatedly.

### Risk 2: Strength too early

Trying to beat mature engines before correctness is locked will slow the project and create fragile code.

### Risk 3: Protocol drift

If C++ and TypeScript message schemas evolve independently, integration bugs will become expensive.

### Risk 4: Evaluation bloat

Too many handcrafted features too early can reduce speed before we know which features matter.

---

## 16. Recommended Team Working Order

1. freeze rules
2. build move legality
3. prove correctness with perft
4. build search core
5. wire protocol
6. wire frontend analysis
7. add stronger evaluation
8. tune and benchmark against Sidra

This order keeps us honest and prevents us from celebrating engine output that is still built on wrong move generation.

---

## 17. Definition of Done for Mkaguzi-v0.1

`mkaguzi-v0.1` is done when all of the following are true:

- Tanzania move legality is validated by tests
- engine process can be launched from the app reliably
- best move and PV stream correctly into the UI
- eval trace is available
- no make/unmake corruption is found in regression tests
- baseline search is stable under repeated runs
- project docs define the engine contract clearly enough for the next version to extend it safely

---

## 18. Final Direction

`mkaguzi-v0.1` should be treated as the foundation of our owned engine family.

Sidra can still remain useful during the transition period as:

- a benchmark
- a comparison engine
- a fallback engine

But `mkaguzi` is where we invest in ownership, explainability, and Tanzania-specific quality.
