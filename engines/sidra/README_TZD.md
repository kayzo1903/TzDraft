## SiDra – TZD Rule Integration

SiDra is Igor Korshunov's Russian-draughts engine, adapted for Tanzania Draughts-64
(TZD v2.2). It is used as the **Medium difficulty** AI in the TzDraft platform.

---

### Build

**Windows DLL (used by the platform):**
1. Open `SiDra.sln` in Visual Studio
2. Build `Release | x64` → produces `x64/Release/SiDra.dll`

**CLI wrapper (used by the backend):**
```
cl /O2 /EHsc cli/sidra-cli.cpp /link /OUT:cli/sidra-cli.exe
```
or use `build_sidra.bat`.

Place the binaries at the paths configured by `SIDRA_CLI_PATH` in the backend `.env`.

---

### TZD Rule Compliance Status — COMPLETE ✅

| TZD Rule (v2.2) | File | Status |
|---|---|---|
| Men move forward only | Generator.cpp | ✅ |
| Men capture forward only (never backward) | Generator.cpp | ✅ |
| Promotion during capture ends sequence immediately | Generator.cpp | ✅ |
| Flying kings (any distance on diagonals) | Generator.cpp | ✅ |
| Mandatory capture enforcement | Generator.cpp | ✅ |
| Free choice capture (no maximum-capture rule) | Generator.cpp | ✅ |
| Turkish strike rule (can't jump same piece twice) | Generator.cpp | ✅ |
| 30-move rule (Art. 8.3) | Search.cpp | ✅ |
| Threefold repetition (Art. 8.2) | Search.cpp + Move.cpp | ✅ |
| K vs K / 2K vs K / K+M vs K draw (Art. 8.4) | Search.cpp | ✅ |
| Three Kings Rule (Art. 8.5) | Search.cpp | ✅ |
| Dead `AddPromoCaptures` (TZD violation) guarded | Generator.cpp | ✅ |

---

### Architecture of Draw Detection

Draw rules are enforced at two levels:

**Engine level (this engine):**
Sidra detects draw positions *during search* so it can assign a `0` score and avoid
drifting into theoretically drawn endings.
- **Zobrist hashing** (`Board.cpp`, `Move.cpp`) — a 64-bit hash is maintained
  incrementally in `MakeMove`/`UnmakeMove` using a deterministic xorshift table.
- **Hash history** (`HashHistory[512]`) — real game positions are pushed by
  `EI_MakeMove` / `EI_Think` after every committed move.
- **`rev_count` parameter** propagated through `TreeSearch` — counts consecutive
  reversible half-moves (king-only non-captures) in the search path.
- **`CountPieces()`** helper in `Search.cpp` checks piece composition for
  material-based draw conditions.

**Platform level (official engine / server):**
The TzDraft server enforces the same draw rules authoritatively for actual game
results. The engine's draw detection improves play quality, but the server's
enforcement is the source of truth.

---

### Why Sidra is the Medium AI

Sidra is a solid but dated engine that sits between the simple CAKE (beginner) AI and
the stronger Kallisto (advanced) AI. The intelligence gap comes from:

1. **No transposition table** — each position is re-evaluated from scratch every
   iteration of the iterative-deepening loop. Kallisto uses a large hash table to
   cache scores, eliminating vast amounts of redundant work and reaching depth 20+
   reliably. Sidra typically reaches depth 10-14 in the same time.

2. **No move ordering beyond root** — `RootSearch` places the best root move first
   (move-to-front), but internal nodes have no killer moves, history heuristic, or
   MVV-LVA capture ordering. Poor move ordering means alpha-beta prunes far fewer
   branches, wasting search time on clearly inferior lines.

3. **Flat evaluation function** — the evaluation uses piece-square tables (PST) plus
   material only. There is no mobility score, no king-safety term, no tempo analysis,
   and no awareness of piece coordination or structural weaknesses. Kallisto's
   evaluation is multi-dimensional and trained on thousands of positions.

4. **No opening book** — every game starts from scratch at depth 1. A book of even
   a few hundred common openings would eliminate search time in the first 5-8 moves
   and steer Sidra away from known weak lines.

5. **No endgame database integration by default** — the `EdAccess` interface exists
   and works, but there are no TZD-specific EGDB files shipped with the engine. Kallisto
   ships with 5,212 EGTB files covering all positions up to 5 pieces, giving it
   perfect play from those positions inward.

These limitations are *by design* — Sidra is intended to provide a challenging but
beatable medium experience. Kallisto is the strong AI that serious players face.
