#!/usr/bin/env python3
"""
texel_tune.py -- Texel eval tuner for Mkaguzi (2026 eval structure)
====================================================================
Loads positions from dataset.epd, gets per-component eval scores via
evalTrace IPC, then fits 6 scale factors (one per eval component) that
minimise the Texel MSE loss against the stored depth-8 search scores.

Tuned scale factors map to C++ constants:
  w_material  -> MAN_VALUE, KING_VALUE            (eval.h)
  w_mobility  -> MAN_MOBILITY_SCALE, KING_MOBILITY_SCALE  (mobility.cpp)
  w_tempo     -> TEMPO_BONUS                      (eval.h)
  w_structure -> CENTER_CTRL_BONUS, ISOLATION_PENALTY,
                 SUPPORT_BONUS, EXCHANGE_BONUS,
                 PST_MEN[32], PST_KINGS[32]        (structure.cpp)
  w_kingSafety-> KING_EDGE_PENALTY, KING_TRAPPED_PENALTY (king_safety.cpp)
  w_patterns  -> DOUBLE_CORNER_BONUS, BACK_RANK_BONUS, CHAIN_BONUS,
                 PROMO_THREAT_BONUS, CENTER_CLUSTER_BONUS,
                 BLOCKED_MAN_PENALTY, KING_TRAP_EDGE_PENALTY,
                 WINDOW_COHESION_BONUS             (patterns.cpp)

Usage:
  python texel_tune.py                        # tune, print results (no changes)
  python texel_tune.py --apply                # tune + patch C++ files
  python texel_tune.py --apply --rebuild      # tune + patch + rebuild engine
  python texel_tune.py --positions 20000      # use 20k positions (faster)
  python texel_tune.py --K 250               # custom sigmoid scale

Requirements: numpy, scipy
"""

import subprocess, json, os, sys, math, re, time, argparse, random
import numpy as np
from scipy.optimize import minimize

# ── Constants that map scale factors to file locations ────────────────────────

COMPONENT_NAMES = ['material', 'mobility', 'tempo', 'structure', 'kingSafety', 'patterns']

# Current baseline values (must match C++ source)
BASELINE = {
    # eval.h
    'MAN_VALUE':               100,
    'KING_VALUE':              185,
    'TEMPO_BONUS':              10,
    # mobility.cpp
    'MAN_MOBILITY_SCALE':        4,
    'KING_MOBILITY_SCALE':       2,
    # structure.cpp
    'CENTER_CTRL_BONUS':         8,
    'ISOLATION_PENALTY':        12,
    'SUPPORT_BONUS':             7,
    'EXCHANGE_BONUS':            6,
    # king_safety.cpp
    'KING_EDGE_PENALTY':        12,
    'KING_TRAPPED_PENALTY':     36,
    # patterns.cpp
    'DOUBLE_CORNER_BONUS':      18,
    'BACK_RANK_BONUS':          12,
    'CHAIN_BONUS':              12,
    'PROMO_THREAT_BONUS':        5,
    'CENTER_CLUSTER_BONUS':      8,
    'BLOCKED_MAN_PENALTY':       8,
    'KING_TRAP_EDGE_PENALTY':   18,
    'WINDOW_COHESION_BONUS':     8,
}

# Which component each constant belongs to
COMPONENT_MAP = {
    'material':   ['MAN_VALUE', 'KING_VALUE'],
    'tempo':      ['TEMPO_BONUS'],
    'mobility':   ['MAN_MOBILITY_SCALE', 'KING_MOBILITY_SCALE'],
    'structure':  ['CENTER_CTRL_BONUS', 'ISOLATION_PENALTY', 'SUPPORT_BONUS', 'EXCHANGE_BONUS'],
    'kingSafety': ['KING_EDGE_PENALTY', 'KING_TRAPPED_PENALTY'],
    'patterns':   ['DOUBLE_CORNER_BONUS', 'BACK_RANK_BONUS', 'CHAIN_BONUS',
                   'PROMO_THREAT_BONUS', 'CENTER_CLUSTER_BONUS', 'BLOCKED_MAN_PENALTY',
                   'KING_TRAP_EDGE_PENALTY', 'WINDOW_COHESION_BONUS'],
}

# C++ file that contains each constant (relative to engines/core/)
CONST_FILE = {
    'MAN_VALUE':               'src/eval/eval.h',
    'KING_VALUE':              'src/eval/eval.h',
    'TEMPO_BONUS':             'src/eval/eval.h',
    'MAN_MOBILITY_SCALE':      'src/eval/mobility.cpp',
    'KING_MOBILITY_SCALE':     'src/eval/mobility.cpp',
    'CENTER_CTRL_BONUS':       'src/eval/structure.cpp',
    'ISOLATION_PENALTY':       'src/eval/structure.cpp',
    'SUPPORT_BONUS':           'src/eval/structure.cpp',
    'EXCHANGE_BONUS':          'src/eval/structure.cpp',
    'KING_EDGE_PENALTY':       'src/eval/king_safety.cpp',
    'KING_TRAPPED_PENALTY':    'src/eval/king_safety.cpp',
    'DOUBLE_CORNER_BONUS':     'src/eval/patterns.cpp',
    'BACK_RANK_BONUS':         'src/eval/patterns.cpp',
    'CHAIN_BONUS':             'src/eval/patterns.cpp',
    'PROMO_THREAT_BONUS':      'src/eval/patterns.cpp',
    'CENTER_CLUSTER_BONUS':    'src/eval/patterns.cpp',
    'BLOCKED_MAN_PENALTY':     'src/eval/patterns.cpp',
    'KING_TRAP_EDGE_PENALTY':  'src/eval/patterns.cpp',
    'WINDOW_COHESION_BONUS':   'src/eval/patterns.cpp',
}

# PST arrays in structure.cpp (also scaled by w_structure)
PST_ARRAYS = ['PST_MEN', 'PST_KINGS']

# ── Engine IPC ─────────────────────────────────────────────────────────────────

class TraceEngine:
    """Single engine process used only for evalTrace (no search)."""

    def __init__(self, binary: str):
        self.proc = subprocess.Popen(
            [binary], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, text=True, bufsize=1
        )
        self.proc.stdout.readline()  # drain startup line
        self._send({"type": "setVariant", "variant": "tanzania"})

    def _send(self, msg: dict):
        self.proc.stdin.write(json.dumps(msg) + '\n')
        self.proc.stdin.flush()

    def get_trace(self, fen: str) -> dict:
        """Returns dict with keys: material, mobility, tempo, structure, kingSafety, patterns."""
        self._send({"type": "evalTrace", "fen": fen})
        deadline = time.time() + 5
        while time.time() < deadline:
            line = self.proc.stdout.readline().strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if obj.get("type") == "evalTrace":
                    return obj
            except json.JSONDecodeError:
                continue
        return None

    def close(self):
        try:
            self._send({"type": "quit"})
            self.proc.wait(timeout=3)
        except Exception:
            self.proc.kill()

# ── Dataset loading ────────────────────────────────────────────────────────────

def load_positions(dataset_path: str, n_sample: int, seed: int = 42):
    """
    Read dataset.epd (FEN | score | depth) and return up to n_sample entries.
    Returns list of (fen, score_stm) where score_stm is side-to-move centipawns.
    """
    if not os.path.exists(dataset_path):
        print(f"ERROR: Dataset not found: {dataset_path}")
        sys.exit(1)

    entries = []
    with open(dataset_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            parts = line.strip().split('|')
            if len(parts) < 2:
                continue
            fen   = parts[0].strip()
            try:
                score = int(parts[1].strip())
            except ValueError:
                continue
            entries.append((fen, score))

    total = len(entries)
    if n_sample < total:
        rng = random.Random(seed)
        entries = rng.sample(entries, n_sample)

    print(f"  Loaded {n_sample if n_sample < total else total:,} / {total:,} positions")
    return entries

# ── Feature collection via evalTrace ──────────────────────────────────────────

def collect_features(engine: TraceEngine, positions: list, verbose: bool = True):
    """
    For each (fen, score_stm), get evalTrace and convert to white-relative.
    Returns (features, targets):
      features: (N, 6) float32 array — [mat, mob, tempo, struct, ks, pat] white-relative
      targets:  (N,)   float32 array — score_white_relative (centipawns)
    """
    n  = len(positions)
    features = np.zeros((n, 6), dtype=np.float32)
    targets  = np.zeros(n,      dtype=np.float32)

    t0       = time.time()
    bad      = 0

    for i, (fen, score_stm) in enumerate(positions):
        if verbose and i % 5000 == 0 and i > 0:
            elapsed = time.time() - t0
            rate    = i / elapsed
            eta     = (n - i) / rate if rate > 0 else 0
            print(f"\r  evalTrace {i:>7,}/{n:,}  {rate:.0f}/s  ETA {eta:.0f}s   ",
                  end='', flush=True)

        tr = engine.get_trace(fen)
        if tr is None:
            bad += 1
            continue

        # evalTrace components are white-relative
        mat  = float(tr.get('material',   0))
        mob  = float(tr.get('mobility',   0))
        tmp  = float(tr.get('tempo',      0))
        strc = float(tr.get('structure',  0))
        ks   = float(tr.get('kingSafety', 0))
        pat  = float(tr.get('patterns',   0))

        # score_stm is side-to-move. Convert to white-relative.
        side = fen.strip()[0].upper()  # 'W' or 'B'
        score_white = float(score_stm) if side == 'W' else -float(score_stm)

        # Clamp extreme scores (drawn/won games shouldn't overwhelm gradient)
        score_white = max(-1200.0, min(1200.0, score_white))

        features[i] = [mat, mob, tmp, strc, ks, pat]
        targets[i]  = score_white

    if verbose:
        elapsed = time.time() - t0
        print(f"\r  evalTrace {n:,}/{n:,}  done in {elapsed:.0f}s ({n/elapsed:.0f}/s)   ")
        if bad:
            print(f"  Warning: {bad} positions had no trace response (skipped)")

    return features, targets

# ── Texel loss ─────────────────────────────────────────────────────────────────

def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))

def texel_loss_and_grad(w: np.ndarray, features: np.ndarray,
                         targets_sig: np.ndarray, K: float):
    """
    Texel MSE loss + gradient.
    w:            (6,)   scale factors
    features:     (N,6)  white-relative eval components
    targets_sig:  (N,)   sigmoid(oracle_white / K)
    """
    predicted = features @ w          # (N,) white-relative weighted sum
    pred_sig  = sigmoid(predicted / K)
    residual  = pred_sig - targets_sig                    # (N,)

    loss = float(np.mean(residual ** 2))

    # d(loss)/d(w_j) = mean(2 * residual * pred_sig * (1-pred_sig) * features[:,j] / K)
    dsig = pred_sig * (1.0 - pred_sig)
    grad = 2.0 * np.mean(residual[:, None] * dsig[:, None] * features / K, axis=0)

    return loss, grad

# ── Tuning ─────────────────────────────────────────────────────────────────────

def tune(features: np.ndarray, targets: np.ndarray, K: float):
    """
    Fit 6 scale factors via L-BFGS-B.
    Returns (w_opt, initial_loss, final_loss).
    """
    targets_sig = sigmoid(targets / K)

    def fn(w):
        loss, grad = texel_loss_and_grad(w, features, targets_sig, K)
        return loss, grad

    w0     = np.ones(6, dtype=np.float64)
    bounds = [(0.2, 5.0)] * 6  # don't let any component collapse to 0 or explode

    init_loss, _ = fn(w0)

    result = minimize(
        fn, w0, method='L-BFGS-B', jac=True,
        bounds=bounds,
        options={'maxiter': 500, 'ftol': 1e-12, 'gtol': 1e-8}
    )

    final_loss = float(result.fun)
    return result.x, init_loss, final_loss

def auto_tune_K(features: np.ndarray, targets: np.ndarray) -> float:
    """Find K that minimises loss with unit weights (quick grid search)."""
    best_K, best_loss = 300.0, 1e18
    for K in [100, 150, 200, 250, 300, 400, 500]:
        targets_sig = sigmoid(targets / K)
        w0 = np.ones(6)
        loss = float(np.mean((sigmoid(features @ w0 / K) - targets_sig) ** 2))
        if loss < best_loss:
            best_loss, best_K = loss, K
    return best_K

# ── File patching ──────────────────────────────────────────────────────────────

def patch_constexpr(text: str, name: str, new_val: int) -> str:
    """Replace `constexpr int NAME = OLD;` with new value."""
    pattern = rf'(constexpr\s+int\s+{re.escape(name)}\s*=\s*)(\d+)(\s*;)'
    def repl(m):
        return m.group(1) + str(new_val) + m.group(3)
    return re.sub(pattern, repl, text)

def scale_pst_array(text: str, array_name: str, scale: float) -> str:
    """Scale all integer values inside a `static const int NAME[32] = { ... };` block."""
    pattern = rf'(static\s+const\s+int\s+{re.escape(array_name)}\s*\[\s*32\s*\]\s*=\s*\{{)([^}}]+)(\}}\s*;)'

    def repl(m):
        # Strip C++ line comments before extracting numbers to avoid
        # picking up numbers from comment text (e.g. "// Row 7")
        body_no_comments = re.sub(r'//[^\n]*', '', m.group(2))
        nums = [int(x) for x in re.findall(r'-?\d+', body_no_comments)]
        if len(nums) != 32:
            return m.group(0)  # safety: don't corrupt if parse failed
        scaled = [max(1, round(n * scale)) for n in nums]
        # Rebuild with 4-per-row formatting, no comments (clean)
        rows = []
        for r in range(8):
            row_vals = scaled[r*4:(r+1)*4]
            rows.append('    ' + ', '.join(f'{v:3d}' for v in row_vals) + ',')
        body = '\n' + '\n'.join(rows) + '\n'
        return m.group(1) + body + m.group(3)

    return re.sub(pattern, repl, text, flags=re.DOTALL)

def patch_files(weights: np.ndarray, core_dir: str, dry_run: bool = False):
    """
    Apply scale factors to all relevant C++ files.
    weights: [w_material, w_mobility, w_tempo, w_structure, w_kingSafety, w_patterns]
    """
    w = dict(zip(COMPONENT_NAMES, weights))

    # Build map: constant_name -> new_value
    changes = {}
    for component, const_names in COMPONENT_MAP.items():
        scale = w[component]
        for name in const_names:
            old = BASELINE[name]
            new = max(1, round(old * scale))
            changes[name] = (old, new, scale)

    # Group by file
    files_to_patch = {}
    for name, (old, new, scale) in changes.items():
        fpath = os.path.join(core_dir, CONST_FILE[name])
        files_to_patch.setdefault(fpath, []).append((name, old, new))

    print()
    print("  Constant changes:")
    for fpath, consts in sorted(files_to_patch.items()):
        relpath = os.path.relpath(fpath, core_dir)
        print(f"  [{relpath}]")
        for name, old, new in sorted(consts, key=lambda x: x[0]):
            arrow = '->' if new != old else '=='
            pct   = (new - old) / old * 100 if old else 0
            print(f"    {name:<30}  {old:4d} {arrow} {new:4d}  ({pct:+.1f}%)")

    # PST arrays (structure component)
    w_struct = w['structure']
    struct_file = os.path.join(core_dir, 'src/eval/structure.cpp')
    print(f"  [src/eval/structure.cpp] — PST arrays scaled by {w_struct:.4f}")

    if dry_run:
        print()
        print("  (Dry run — no files modified. Use --apply to patch.)")
        return

    # Apply to each unique file
    for fpath, consts in files_to_patch.items():
        with open(fpath, 'r', encoding='utf-8') as f:
            text = f.read()
        for name, old, new in consts:
            text = patch_constexpr(text, name, new)
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(text)

    # Scale PST arrays in structure.cpp
    with open(struct_file, 'r', encoding='utf-8') as f:
        text = f.read()
    for arr in PST_ARRAYS:
        text = scale_pst_array(text, arr, w_struct)
    with open(struct_file, 'w', encoding='utf-8') as f:
        f.write(text)

    print()
    print("  Files patched successfully.")

# ── Rebuild ────────────────────────────────────────────────────────────────────

def rebuild(core_dir: str):
    build_dir = os.path.join(core_dir, 'build')
    if not os.path.exists(build_dir):
        print(f"ERROR: Build directory not found: {build_dir}")
        print("Run: cd engines/core && cmake -B build -DCMAKE_BUILD_TYPE=Release")
        return False

    # Use MSBuild on Windows if available
    msbuild = r"C:\Program Files\Microsoft Visual Studio\18\Insiders\MSBuild\Current\Bin\MSBuild.exe"
    sln_path = os.path.join(build_dir, 'mkaguzi_engine.sln')

    print()
    print("  Rebuilding engine...")
    t0 = time.time()

    if os.path.exists(msbuild) and os.path.exists(sln_path):
        cmd = [msbuild, sln_path, '/p:Configuration=Release', '/m', '/nologo', '/v:m']
    else:
        cmd = ['cmake', '--build', build_dir, '--config', 'Release']

    result = subprocess.run(cmd, capture_output=True, text=True)
    elapsed = time.time() - t0

    if result.returncode == 0:
        print(f"  Build succeeded in {elapsed:.0f}s")
        return True
    else:
        print(f"  Build FAILED (exit {result.returncode}):")
        for line in (result.stdout + result.stderr).splitlines()[-20:]:
            print(f"    {line}")
        return False

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    here     = os.path.dirname(os.path.abspath(__file__))
    core_dir = os.path.normpath(os.path.join(here, '..'))
    default_bin = os.path.join(core_dir, 'build', 'Release', 'mkaguzi.exe')
    default_ds  = os.path.join(core_dir, 'dataset.epd')

    ap = argparse.ArgumentParser(description='Texel eval tuner for Mkaguzi')
    ap.add_argument('--positions', type=int,   default=80000, help='Positions to sample (default 80000)')
    ap.add_argument('--K',         type=float, default=0,     help='Sigmoid scale K in cp (0=auto, default)')
    ap.add_argument('--apply',     action='store_true',       help='Patch C++ files with tuned constants')
    ap.add_argument('--rebuild',   action='store_true',       help='Rebuild engine after patching (implies --apply)')
    ap.add_argument('--binary',    default=default_bin,       help='Path to mkaguzi.exe')
    ap.add_argument('--dataset',   default=default_ds,        help='Path to dataset.epd')
    ap.add_argument('--seed',      type=int,   default=42,    help='Random seed for position sampling')
    args = ap.parse_args()

    if args.rebuild:
        args.apply = True

    W = 66
    print("=" * W)
    print("  Mkaguzi Texel Eval Tuner")
    print("=" * W)

    if not os.path.exists(args.binary):
        print(f"ERROR: Engine binary not found: {args.binary}")
        print("Build first: cmake --build engines/core/build --config Release")
        return 1

    # Step 1 — load positions
    print()
    print("  Step 1 — Loading dataset")
    positions = load_positions(args.dataset, args.positions, args.seed)

    # Step 2 — collect evalTrace features
    print()
    print("  Step 2 — Collecting eval traces")
    engine = TraceEngine(args.binary)
    try:
        features, targets = collect_features(engine, positions)
    finally:
        engine.close()

    # Filter out any zero-feature rows (failed traces)
    valid = np.any(features != 0, axis=1)
    features = features[valid]
    targets  = targets[valid]
    print(f"  Valid positions: {len(features):,}")

    if len(features) < 1000:
        print("ERROR: Too few valid positions. Check binary and dataset.")
        return 1

    # Step 3 — find K
    if args.K <= 0:
        print()
        print("  Step 3 — Auto-selecting K (sigmoid scale)...")
        K = auto_tune_K(features, targets)
        print(f"  K = {K}")
    else:
        K = args.K
        print()
        print(f"  Step 3 — Using K = {K} (user-specified)")

    # Step 4 — tune
    print()
    print("  Step 4 — L-BFGS-B optimisation (6 scale factors)...")
    t0 = time.time()
    w_opt, init_loss, final_loss = tune(features, targets, K)
    elapsed = time.time() - t0

    improvement = (init_loss - final_loss) / init_loss * 100 if init_loss > 0 else 0

    print()
    print("  Optimisation results:")
    print(f"    {'Component':<14}  {'Scale':>7}  {'Direction'}")
    print(f"    {'-'*14}  {'-'*7}  {'-'*20}")
    for name, w in zip(COMPONENT_NAMES, w_opt):
        direction = ('increase' if w > 1.05 else
                     'decrease' if w < 0.95 else
                     'unchanged (~)')
        print(f"    {name:<14}  {w:7.4f}  {direction}")
    print()
    print(f"    Initial loss:   {init_loss:.6f}")
    print(f"    Final loss:     {final_loss:.6f}  (-{improvement:.1f}%)")
    print(f"    Optimised in:   {elapsed:.1f}s")

    # Step 5 — patch / dry-run
    print()
    print("  Step 5 — Constant changes:")
    patch_files(w_opt, core_dir, dry_run=not args.apply)

    # Step 6 — rebuild
    if args.rebuild:
        ok = rebuild(core_dir)
        if not ok:
            return 1

    print()
    print("=" * W)
    if args.apply:
        print("  Done. C++ files patched.")
        if args.rebuild:
            print("  Engine rebuilt with tuned constants.")
        else:
            print("  Rebuild to apply: cmake --build engines/core/build --config Release")
    else:
        print("  Dry run complete. Re-run with --apply to patch files.")
    print("=" * W)
    return 0


if __name__ == '__main__':
    sys.exit(main())
