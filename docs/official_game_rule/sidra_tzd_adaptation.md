# SiDra (Sidra) Adaptation to Tanzania Draughts-64 Official Rules (v2.2)

Date: 2026-02-15

Source rules: `docs/official_game_rule/Tanzania_Draughts_64_Official_Rules_v2.2_PUBLICATION_READY.md`

This note focuses on what “TZD v2.2 compliance” means for the Sidra engine integration, and what has to change (or be enforced) so Sidra-generated moves are always legal under the official Tanzania Draughts-64 rules.

## TZD v2.2 Requirements That Affect Engine/Integration

Core move legality:
- Men move forward only.
- **Men capture forward only (never backward), including during multi-capture.**
- Kings are **flying kings**: move and capture any distance diagonally (with empty squares).
- Mandatory capture: if any capture exists, a non-capture move is illegal.
- **Free choice capture**: when multiple captures exist, the player/engine may choose any legal capture (no “maximum capture” rule).
- King multi-capture may continue **on the same or perpendicular diagonal**; direction may change.
- **Promotion during capture ends the sequence immediately** (a man that reaches the back rank stops; it does not continue capturing as a king on the same move).

Governance/draw logic (engine/platform-side):
- Threefold repetition.
- 30-move rule (kings only, no captures): 30 full moves = 60 ply.
- Endgame draw rules (K vs K, K+man vs K, etc.) and the “3+ kings vs 1 king” rule.

## Where Sidra Touches The Rules In This Repo

- Backend Sidra endpoint: `backend/src/interface/http/controllers/sidra.controller.ts`
- Backend Sidra integration: `backend/src/application/engines/sidra-engine.service.ts`
- Backend coordinate/capture inference: `backend/src/application/engines/sidra-mapper.ts`
- Sidra engine move generation: `engines/sidra/Generator.cpp`
- Official rules + draw logic implementation: `packages/official-engine/src/engine.ts` (built on `packages/cake-engine`)

## Findings (Pre-Change)

1. Sidra C++ rules mismatches vs TZD v2.2:
- Men capture generation allowed backward captures (violates Article 4.1 / 4.2 / 4.5).
- Promotion during capture continued as a king (violates Article 4.10).
- King multi-capture forced a diagonal change (did not allow “same diagonal” continuations; violates Article 4.6).

2. Backend Sidra mapper mismatches:
- Capture inference for men allowed backward jumps.
- Capture inference preferred the longest inferred path (“Max Capture Rule”), but TZD is **free choice**.

3. Backend Sidra endpoint accepted Sidra output without validating it against the official ruleset.

## Changes Applied (2026-02-15)

These changes make the Sidra endpoint produce TZD-legal moves even if the native engine is misconfigured, and align the native generator toward TZD rules.

Backend enforcement:
- `backend/src/application/engines/sidra-engine.service.ts`
  - Validates Sidra’s `(from,to)` against `@tzdraft/official-engine` legal move generation.
  - If Sidra suggests an illegal move, it falls back to a random legal move from the official engine.
  - Returns official-engine `capturedSquares` / `isPromotion` so the caller gets TZD-consistent capture data.

Backend capture inference alignment:
- `backend/src/application/engines/sidra-mapper.ts`
  - Men capture inference is forward-only.
  - Stops searching past promotion squares (promotion ends capture).
  - Removes “prefer max captures” behavior (returns the first valid path to the requested destination).

Sidra native generator alignment:
- `engines/sidra/Generator.cpp`
  - Men captures are forward-only.
  - Promotion during capture ends the sequence immediately.
  - King capture no longer blocks “same diagonal” follow-ups.

Notes:
- The native changes require rebuilding the SiDra DLL and the `sidra-cli.exe` wrapper before they affect production binaries.
- Backend enforcement works immediately (it uses official-engine for legality) as long as the request pieces/positions match cake-engine coordinates.

## What’s Still Needed For Full Compliance

1. Rebuild and ship the engine binaries:
- Rebuild `engines/sidra` (DLL) and the wrapper at `engines/sidra/bin/sidra-cli.exe`.

2. Add a TZD legality test suite (recommended, per Article 13.7):
- Add a small set of known positions to validate:
  - Men backward-capture attempts are rejected.
  - Promotion ends capture (no continuation).
  - Kings can continue capturing on the same diagonal.
  - Free-choice capture (no max-capture enforcement).

3. Ensure the *game* rules path uses `@tzdraft/official-engine`:
- The repo already has `packages/official-engine` implementing draw rules and using cake-engine legality.
- If the live game flow still uses the legacy domain services under `backend/src/domain/game`, it should be migrated to the official-engine API to match the rulebook and draw governance.

