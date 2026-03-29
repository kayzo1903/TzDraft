#!/usr/bin/env python3
"""
Gauntlet: Mkaguzi vs Sidra
Plays N alternating-color games and reports W/D/L + Elo estimate.

Usage:
  python gauntlet.py [--games 20] [--time 500] [--verbose]

Note: depth is no longer a parameter — Mkaguzi searches to depth 64
      and uses the time budget as the only termination condition.
"""

import subprocess, json, sys, os, math, time, argparse
from typing import Optional

# ── Board geometry ───────────────────────────────────────────────────────────
# 32 dark squares numbered 0-31.
# Row formula : row(sq) = 7 - (sq >> 2)
# Col formula : col(sq) = (sq & 3)*2 + (1 if row is odd else 0)
# Dark squares have (row+col) % 2 == 0
# PDN (1-based): PDN = sq + 1

DR = [1,  1, -1, -1]   # NE, NW, SE, SW row deltas
DC = [1, -1,  1, -1]   # column deltas

def sq_row(sq: int) -> int:
    return 7 - (sq >> 2)

def sq_col(sq: int) -> int:
    r = sq_row(sq)
    return (sq & 3) * 2 + (1 if r % 2 == 1 else 0)

def rc_to_sq(r: int, c: int) -> int:
    """Return square index for (row, col), or -1 if off-board / light square."""
    if r < 0 or r > 7 or c < 0 or c > 7:
        return -1
    if (r + c) % 2 != 0:   # light square
        return -1
    return (7 - r) * 4 + c // 2

# Precompute adjacency tables once at import time
_JUMP_OVER: list = [{}  for _ in range(32)]
_JUMP_LAND: list = [{}  for _ in range(32)]
_STEP_SQ:   list = [{}  for _ in range(32)]

for _sq in range(32):
    _r, _c = sq_row(_sq), sq_col(_sq)
    for _d in range(4):
        _r1, _c1 = _r + DR[_d],     _c + DC[_d]
        _r2, _c2 = _r + 2*DR[_d],   _c + 2*DC[_d]
        _STEP_SQ  [_sq][_d] = rc_to_sq(_r1, _c1)
        _JUMP_OVER[_sq][_d] = rc_to_sq(_r1, _c1)
        _JUMP_LAND[_sq][_d] = rc_to_sq(_r2, _c2)

def pdn(sq: int)  -> int: return sq + 1
def sq(p:  int)   -> int: return p  - 1

# ── Board representation ─────────────────────────────────────────────────────
# board: dict { sq_index: (color, piece_type) }
#   color      = 'w' | 'b'
#   piece_type = 'm' | 'k'

def starting_board() -> dict:
    b = {}
    for s in range(12):           b[s]  = ('b', 'm')   # black men rows 7,6,5
    for s in range(20, 32):       b[s]  = ('w', 'm')   # white men rows 2,1,0
    return b

def board_to_fen(board: dict, side: str) -> str:
    """Build PDN FEN:  W:W21,22,...:B1,2,..."""
    wp, bp = [], []
    for s in sorted(board):
        c, t = board[s]
        p = ('K' if t == 'k' else '') + str(pdn(s))
        (wp if c == 'w' else bp).append(p)
    sc = 'W' if side == 'w' else 'B'
    return f"{sc}:W{','.join(wp)}:B{','.join(bp)}"

def board_to_sidra_json(board: dict, side: str, time_ms: int) -> str:
    pieces = [
        {"type": "KING" if t == 'k' else "MAN",
         "color": "WHITE" if c == 'w' else "BLACK",
         "position": pdn(s)}
        for s, (c, t) in board.items()
    ]
    return json.dumps({
        "currentPlayer": "WHITE" if side == 'w' else "BLACK",
        "timeLimitMs": time_ms,
        "pieces": pieces
    })

# ── Move application ─────────────────────────────────────────────────────────

def _cap_dirs(is_king: bool, side: str) -> list:
    """Directions a piece may capture in (Tanzania: men forward only)."""
    if is_king:
        return [0, 1, 2, 3]
    return [0, 1] if side == 'w' else [2, 3]

def _find_path(board: dict, cur: int, target: int,
               side: str, is_king: bool,
               removed: frozenset = frozenset()) -> Optional[list]:
    """
    DFS: find sequence of captured squares to reach `target` from `cur`.
    Returns list of captured sq indices, or None.
    """
    if cur == target:
        return []
    enemy = 'b' if side == 'w' else 'w'
    for d in _cap_dirs(is_king, side):
        over = _JUMP_OVER[cur][d]
        land = _JUMP_LAND[cur][d]
        if over < 0 or land < 0:
            continue
        if over in removed:
            continue
        if over not in board or board[over][0] != enemy:
            continue
        if land in board:           # landing square occupied
            continue
        new_removed = removed | {over}
        if land == target:
            return [over]
        rest = _find_path(board, land, target, side, is_king, new_removed)
        if rest is not None:
            return [over] + rest
    return None

def apply_move(board: dict, from_pdn: int, to_pdn: int, side: str) -> list:
    """
    Apply a move. Returns list of captured PDN squares (may be empty).
    Mutates `board` in place.
    """
    fs = sq(from_pdn)
    ts = sq(to_pdn)
    piece = board.pop(fs)
    is_king = piece[1] == 'k'

    captured_sq = []
    # Detect capture: in Tanzania short-king rules, any jump is exactly 2 rows
    row_delta = abs(sq_row(ts) - sq_row(fs))
    if row_delta >= 2:
        path = _find_path(board, fs, ts, side, is_king)
        if path:
            captured_sq = path
            for cap in path:
                board.pop(cap, None)

    # Promotion
    row_to = sq_row(ts)
    if piece[1] == 'm':
        if (side == 'w' and row_to == 7) or (side == 'b' and row_to == 0):
            piece = (piece[0], 'k')

    board[ts] = piece
    return [pdn(c) for c in captured_sq]

# ── Legal-move detection ──────────────────────────────────────────────────────

def _has_any_capture(board: dict, side: str) -> bool:
    enemy = 'b' if side == 'w' else 'w'
    for s, (c, t) in board.items():
        if c != side:
            continue
        for d in _cap_dirs(t == 'k', side):
            over = _JUMP_OVER[s][d]
            land = _JUMP_LAND[s][d]
            if over >= 0 and land >= 0 and over in board \
               and board[over][0] == enemy and land not in board:
                return True
    return False

def has_legal_moves(board: dict, side: str) -> bool:
    if _has_any_capture(board, side):
        return True
    for s, (c, t) in board.items():
        if c != side:
            continue
        is_king = t == 'k'
        dirs = [0, 1, 2, 3] if is_king else ([0, 1] if side == 'w' else [2, 3])
        r, col = sq_row(s), sq_col(s)
        for d in dirs:
            ns = rc_to_sq(r + DR[d], col + DC[d])
            if ns >= 0 and ns not in board:
                return True
    return False

# ── Engine wrappers ───────────────────────────────────────────────────────────

class MkaguziProcess:
    """Persistent mkaguzi process — keep alive across all games."""

    def __init__(self, binary: str):
        self.proc = subprocess.Popen(
            [binary], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True
        )
        self._drain_init()
        self._send({"type": "setVariant", "variant": "tanzania"})

    def _drain_init(self):
        """Consume any startup messages."""
        import select, platform
        if platform.system() == 'Windows':
            # Windows: just read the first line (the log message)
            self.proc.stdout.readline()
        else:
            while True:
                r, _, _ = select.select([self.proc.stdout], [], [], 0.1)
                if not r:
                    break
                line = self.proc.stdout.readline()
                if not line:
                    break

    def _send(self, msg: dict):
        self.proc.stdin.write(json.dumps(msg) + '\n')
        self.proc.stdin.flush()

    def get_move(self, fen: str, time_ms: int,
                 history: list = None) -> Optional[str]:
        msg = {"type": "setPosition", "fen": fen}
        if history:
            msg["history"] = history
        self._send(msg)
        # depth=64 = effectively unlimited; time budget is the only constraint
        self._send({"type": "go", "depth": 64, "timeMs": time_ms, "multiPV": 1})
        while True:
            line = self.proc.stdout.readline().strip()
            if not line:
                return None
            try:
                msg = json.loads(line)
                if msg.get("type") == "bestmove":
                    return msg.get("move")
            except json.JSONDecodeError:
                continue

    def close(self):
        try:
            self._send({"type": "quit"})
            self.proc.wait(timeout=3)
        except Exception:
            self.proc.kill()


def ask_sidra(sidra_path: str, board: dict, side: str, time_ms: int) -> Optional[dict]:
    """One-shot Sidra call. Returns parsed JSON or None on error.
    Sidra writes search info to stdout followed by the JSON result on the last line."""
    payload = board_to_sidra_json(board, side, time_ms)
    try:
        r = subprocess.run(
            [sidra_path], input=payload, capture_output=True,
            text=True, timeout=time_ms / 1000 + 10
        )
        if r.returncode != 0:
            return None
        # Last non-empty line is the JSON result; preceding lines are search info
        lines = [l.strip() for l in r.stdout.splitlines() if l.strip()]
        if not lines:
            return None
        last_line = lines[-1]
        # print(f"DEBUG Sidra: {last_line}", file=sys.stderr)
        return json.loads(last_line)
    except Exception as e:
        print(f"  [sidra error] {e}", file=sys.stderr)
        return None

# ── Game loop ─────────────────────────────────────────────────────────────────

MAX_HALFMOVES    = 200   # safety draw
DRAW_NO_PROGRESS = 80    # half-moves without capture or promotion -- draw

def play_game(mkaguzi: MkaguziProcess, sidra_path: str,
              mkaguzi_side: str, time_ms: int,
              verbose: bool = False) -> str:
    """
    Play one game. mkaguzi_side = 'w' or 'b'.
    Returns winner ('w' or 'b') or 'draw'.
    """
    board = starting_board()
    turn = 'w'
    no_progress = 0
    position_history: dict = {}   # FEN -> count, for 3-fold repetition
    fen_log: list = []            # ordered list of all FENs seen (for mkaguzi history)

    for _ in range(MAX_HALFMOVES):
        if not has_legal_moves(board, turn):
            return 'b' if turn == 'w' else 'w'   # no moves -- loss
        if no_progress >= DRAW_NO_PROGRESS:
            return 'draw'

        fen = board_to_fen(board, turn)
        # 3-fold repetition: same position (including side-to-move) seen 3 times
        position_history[fen] = position_history.get(fen, 0) + 1
        if position_history[fen] >= 3:
            return 'draw'

        if turn == mkaguzi_side:
            # Pass prior FENs so mkaguzi can detect game-level repetitions.
            # Keep up to 20 prior positions (sufficient to detect all relevant repetitions).
            move_str = mkaguzi.get_move(fen, time_ms, history=fen_log[-20:])
            if not move_str or len(move_str) < 4:
                return 'b' if turn == 'w' else 'w'
            fp = int(move_str[:2])
            tp = int(move_str[2:4])
            engine_label = 'mkaguzi'
        else:
            res = ask_sidra(sidra_path, board, turn, time_ms)
            if not res or res.get('from', -1) < 0:
                return 'b' if turn == 'w' else 'w'
            fp, tp = res['from'], res['to']
            engine_label = 'sidra  '

        if verbose:
            print(f"    {engine_label} ({turn}): {fp:02d}--{tp:02d}")

        fen_log.append(fen)
        enemy_before = sum(1 for c, _ in board.values() if c != turn)
        apply_move(board, fp, tp, turn)
        enemy_after  = sum(1 for c, _ in board.values() if c != turn)

        no_progress = 0 if enemy_after < enemy_before else no_progress + 1
        turn = 'b' if turn == 'w' else 'w'

    return 'draw'

# ── Elo helpers ───────────────────────────────────────────────────────────────

def elo_diff(w: int, d: int, l: int) -> float:
    n = w + d + l
    if n == 0: return 0.0
    p = max(0.001, min(0.999, (w + d * 0.5) / n))
    return -400 * math.log10(1 / p - 1)

def elo_error(w: int, d: int, l: int) -> float:
    n = w + d + l
    if n < 2: return 999.0
    p = max(0.001, min(0.999, (w + d * 0.5) / n))
    se = math.sqrt(p * (1 - p) / n)
    return 1.96 * 400 / math.log(10) / (p * (1 - p)) * se

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> int:
    here = os.path.dirname(os.path.abspath(__file__))
    # tuning/ is inside engines/core/, so go up two levels for repo root
    root = os.path.normpath(os.path.join(here, '..', '..', '..'))

    ap = argparse.ArgumentParser(description='Gauntlet: Mkaguzi vs Sidra')
    ap.add_argument('--games',   type=int, default=20,   help='Games to play (default 20)')
    ap.add_argument('--time',    type=int, default=500,  help='ms per move (default 500)')
    ap.add_argument('--verbose', action='store_true',    help='Print each move')
    ap.add_argument('--mkaguzi', default=os.path.join(
        here, '..', 'build', 'Release', 'mkaguzi.exe'))
    ap.add_argument('--sidra',   default=os.path.join(
        root, 'engines', 'sidra', 'cli', 'sidra-cli.exe'))
    args = ap.parse_args()

    mkaguzi_bin = os.path.normpath(args.mkaguzi)
    sidra_bin   = os.path.normpath(args.sidra)

    for path, name in [(mkaguzi_bin, 'mkaguzi'), (sidra_bin, 'sidra-cli')]:
        if not os.path.exists(path):
            print(f"ERROR: {name} binary not found:\n  {path}")
            return 1

    print("=" * 62)
    print(f"  Gauntlet: Mkaguzi  vs  Sidra")
    print(f"  {args.games} games  |  {args.time}ms/move  |  depth=unlimited")
    print("=" * 62)

    mkaguzi = MkaguziProcess(mkaguzi_bin)
    wins = draws = losses = 0

    for g in range(1, args.games + 1):
        mk_side = 'w' if g % 2 == 1 else 'b'
        t0 = time.time()

        if args.verbose:
            print(f"\nGame {g} — mkaguzi plays {'WHITE' if mk_side=='w' else 'BLACK'}")

        result = play_game(mkaguzi, sidra_bin, mk_side, args.time, args.verbose)
        elapsed = time.time() - t0

        if   result == mk_side:  wins   += 1; tag = 'WIN '
        elif result == 'draw':   draws  += 1; tag = 'DRAW'
        else:                    losses += 1; tag = 'LOSS'

        elo = elo_diff(wins, draws, losses)
        err = elo_error(wins, draws, losses)
        side_chr = 'W' if mk_side == 'w' else 'B'

        print(f"  Game {g:3}/{args.games} [{side_chr}] {tag}  "
              f"{wins}W {draws}D {losses}L  "
              f"Elo {elo:+.0f} ±{err:.0f}  ({elapsed:.1f}s)")

    mkaguzi.close()

    n = wins + draws + losses
    pct = 100 * (wins + draws * 0.5) / n if n else 0
    elo = elo_diff(wins, draws, losses)
    err = elo_error(wins, draws, losses)

    print()
    print("=" * 62)
    print(f"  Final: {wins}W / {draws}D / {losses}L  ({pct:.1f}%)")
    print(f"  Elo vs Sidra:  {elo:+.0f} ±{err:.0f}  (95% CI)")
    print()
    if   elo >  50: verdict = "STRONGER than Sidra -- ready to wire in as primary engine."
    elif elo > -50: verdict = "ROUGHLY EQUAL to Sidra -- good co-engine candidate."
    else:           verdict = "WEAKER than Sidra -- improve eval before replacing."
    print(f"  Verdict: Mkaguzi is {verdict}")
    print("=" * 62)

    return 0

if __name__ == '__main__':
    sys.exit(main())
