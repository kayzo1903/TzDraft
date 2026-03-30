# Mkaguzi Engine Changelog

All notable changes to the Mkaguzi engine will be documented in this file.

## [v1.1.0] - 2026-03-30
### Changed
- **Rules Engine updated to Tanzania Draughts v2.3 Official Rules** (`TZ-8x8-v2.3`).
- **King vs. King (Art 8.1)**: Modified engine evaluation so that `1K vs 1K` is no longer treated as an automatic draw (`insufficient_material`). Kings can capture kings, and the game explicitly continues until a separate draw condition triggers or time expires.
- **Endgame Draw Count (Art 8.4)**: Adjusted constraints so that the 5-move endgame draw rule applies explicitly to `2K vs 1K` and `K+Man vs 1K`, strictly counting only the full moves made by the weak side (lone king).
- **Thirty-Move Rule**: Fixed threshold in `isDrawByThirtyMoveRule` to correctly require 60 half-moves.
- **Three-Kings Rule**: Adjusted the threshold in `isDrawByThreeKingsRule` to exactly 12 full moves made by the stronger side.
- **Cake Engine**: Removed legacy automatic draw evaluations for `1K vs 1K` in Cake Engine to keep parity with v2.3 standards.
- Re-built and successfully verified `mkaguzi_wasm` with `emcmake` including all regressions.

## [v1.0.0] - 2026-03-26
- Baseline release. See `MKAGUZI_V0_1_IMPLEMENTATION_REPORT.md` for architecture details.
