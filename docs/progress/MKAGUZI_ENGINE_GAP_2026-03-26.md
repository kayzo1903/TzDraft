# Mkaguzi Engine Gap Report (Rewritten)

**Date:** 2026-03-26  
**Scope:** Mkaguzi engine status after the latest improvement pass  
**Current status:** Baseline is real and improving, but `v0.1` is not closed yet

---

## 1. Current State

Mkaguzi is now a functioning engine path with:

- C++ search/eval/movegen core
- JSON IPC process loop
- backend adapter wiring
- stronger rule-driven behavior than the initial baseline

Mkaguzi should now be considered:

- beyond planning stage
- suitable for focused hardening
- not yet production-verified

---

## 2. What Improved

This pass materially improved core quality:

- repetition bookkeeping improved
- capture filtering made more rule-config aware
- `probe` message path added
- `info` output now includes `pv` and `pvIndex`
- `bestmove` output includes `ponder`
- stop path moved toward shared stop signaling
- root Multi-PV logic introduced
- perft checks strengthened

---

## 3. Open Gaps

### A. Build and Verification Gap (High)

Latest code updates still require full compile verification in an environment with build tools available.

**Why it matters**

- source changes exist, but build confidence is incomplete until rebuilt and run

### B. Runtime Protocol Validation Gap (High)

Updated runtime paths must be explicitly verified:

- `go`
- `stop`
- `multiPV`
- `probe`
- `evalTrace`

**Why it matters**

- protocol claims and runtime behavior must match in real execution, not only in source review

### C. Concurrency and Stream-Safety Gap (High)

Search now includes threaded behavior and shared stdout output.

Open risks:

- thread lifecycle edge cases
- output ordering under repeated commands
- malformed/interleaved JSON lines under stress
- stale `bestmove` mapping to wrong request

### D. Move Legality Confidence Gap (Medium)

Perft is stronger than before, but still too narrow if mostly anchored to opening baseline positions.

Still needed:

- forced-capture edge positions
- promotion-during-capture cases
- max-capture and majority-capture edge cases
- repetition-sensitive positions
- king movement corner cases

### E. Variant Adaptability Proof Gap (Medium)

The architecture is more variant-friendly, but still lacks hard proof through a second variant validation pass.

### F. Strength and Infrastructure Gaps (Medium)

Still pending:

- search tuning (LMR, aspiration, deeper ordering)
- evaluation tuning
- non-stub endgame support
- meaningful opening book integration

---

## 4. Acceptance Criteria

`v0.1` gap closure requires all checks below to pass.

### Build baseline

1. Engine build succeeds in Debug and Release.
2. Perft target build succeeds.

### Runtime protocol

1. `go` returns streaming `info` and final `bestmove`.
2. `go` followed by `stop` returns quickly without hang.
3. `multiPV: 3` emits at least three lines with `pvIndex` `0`, `1`, `2` at shared depth.
4. `evalTrace` returns valid JSON with expected numeric fields.
5. `probe` returns valid JSON with valid `wdl`.

### Concurrency and output integrity

1. 100 repeated `go`/`stop` cycles complete without process restart.
2. No malformed JSON line is emitted in stress run.
3. No overlapping active search threads are observed.
4. Each final `bestmove` maps to the active request.

### Move legality

1. Perft depth 1-5 baseline checks pass.
2. Added edge-case perft/reference positions pass.
3. Make/unmake integrity checks stay green.

### Variant adaptability

1. Second variant selected via `setVariant` without search-core rewrite.
2. Variant-specific legality differences covered by tests.

---

## 5. Execution Order

1. Rebuild engine and perft targets in full toolchain shell.
2. Run baseline perft.
3. Run protocol checks (`go`, `stop`, `multiPV`, `probe`, `evalTrace`).
4. Run concurrency stress loop.
5. Validate backend adapter compatibility.
6. Add and run rule-edge regression/perft suites.
7. Run second-variant validation.
8. Continue search-strength and infrastructure improvements.

---

## 6. Practical Verdict

Mkaguzi is now in a strong baseline phase, not an early concept phase.

The remaining work is clear and bounded:

- prove build and runtime behavior
- harden concurrency/protocol correctness
- increase legality confidence breadth
- validate variant adaptability with evidence
- continue strength tuning

`v0.1` should be considered complete only after those closure checks pass.
