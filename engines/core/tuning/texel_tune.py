#!/usr/bin/env python3
"""
Texel tuning for Mkaguzi engine.

Pipeline:
  1. Generate ~N positions from mkaguzi self-play (depth 4, --games games)
  2. Extract 19-feature vector per position (matches C++ eval exactly)
  3. Minimise MSE(sigmoid(w·f / K), outcome) via L-BFGS-B
  4. Patch the 18 named C++ constants with rounded tuned values
  5. Rebuild the engine with the new weights

Usage:
  python texel_tune.py [--games 80] [--depth 4] [--time 200] [--rebuild]

Requirements:  numpy  scipy
"""

import subprocess, json, os, sys, math, re, time, argparse
from typing import Optional
import numpy as np
from scipy.optimize import minimize

# =============================================================================
# Board geometry (identical to gauntlet.py)
# =============================================================================

DR = [1,  1, -1, -1]   # NE, NW, SE, SW  row deltas
DC = [1, -1,  1, -1]   # column deltas

def sq_row(sq: int) -> int: return 7 - (sq >> 2)

def sq_col(sq: int) -> int:
    r = sq_row(sq)
    return (sq & 3) * 2 + (1 if r % 2 == 1 else 0)

def rc_to_sq(r: int, c: int) -> int:
    if r < 0 or r > 7 or c < 0 or c > 7: return -1
    if (r + c) % 2 != 0: return -1
    return (7 - r) * 4 + c // 2

# Precompute adjacency tables
_STEP = [[rc_to_sq(sq_row(s) + DR[d], sq_col(s) + DC[d])        for d in range(4)] for s in range(32)]
_OVER = [[rc_to_sq(sq_row(s) + DR[d], sq_col(s) + DC[d])        for d in range(4)] for s in range(32)]
_LAND = [[rc_to_sq(sq_row(s) + 2*DR[d], sq_col(s) + 2*DC[d])   for d in range(4)] for s in range(32)]

def pdn(sq): return sq + 1
def sq_(p):  return p - 1

def starting_board() -> dict:
    b = {}
    for s in range(12):      b[s] = ('b', 'm')
    for s in range(20, 32):  b[s] = ('w', 'm')
    return b

def board_to_fen(board: dict, side: str) -> str:
    wp, bp = [], []
    for s in sorted(board):
        c, t = board[s]
        p = ('K' if t == 'k' else '') + str(pdn(s))
        (wp if c == 'w' else bp).append(p)
    sc = 'W' if side == 'w' else 'B'
    return f"{sc}:W{','.join(wp)}:B{','.join(bp)}"

def _cap_dirs(is_king: bool, side: str) -> list:
    if is_king: return [0, 1, 2, 3]
    return [0, 1] if side == 'w' else [2, 3]

def _find_path(board, cur, target, side, is_king, removed=frozenset()):
    if cur == target: return []
    enemy = 'b' if side == 'w' else 'w'
    for d in _cap_dirs(is_king, side):
        over = _OVER[cur][d];  land = _LAND[cur][d]
        if over < 0 or land < 0: continue
        if over in removed: continue
        if over not in board or board[over][0] != enemy: continue
        if land in board: continue
        new_removed = removed | {over}
        if land == target: return [over]
        rest = _find_path(board, land, target, side, is_king, new_removed)
        if rest is not None: return [over] + rest
    return None

def apply_move(board: dict, from_pdn: int, to_pdn: int, side: str) -> list:
    fs = sq_(from_pdn);  ts = sq_(to_pdn)
    piece = board.pop(fs)
    is_king = piece[1] == 'k'
    captured_sq = []
    if abs(sq_row(ts) - sq_row(fs)) >= 2:
        path = _find_path(board, fs, ts, side, is_king)
        if path:
            captured_sq = path
            for cap in path: board.pop(cap, None)
    row_to = sq_row(ts)
    if piece[1] == 'm':
        if (side == 'w' and row_to == 7) or (side == 'b' and row_to == 0):
            piece = (piece[0], 'k')
    board[ts] = piece
    return [pdn(c) for c in captured_sq]

def _has_any_capture(board, side) -> bool:
    enemy = 'b' if side == 'w' else 'w'
    for s, (c, t) in board.items():
        if c != side: continue
        for d in _cap_dirs(t == 'k', side):
            over = _OVER[s][d];  land = _LAND[s][d]
            if over >= 0 and land >= 0 and over in board \
               and board[over][0] == enemy and land not in board: return True
    return False

def has_legal_moves(board, side) -> bool:
    if _has_any_capture(board, side): return True
    for s, (c, t) in board.items():
        if c != side: continue
        is_king = t == 'k'
        dirs = [0, 1, 2, 3] if is_king else ([0, 1] if side == 'w' else [2, 3])
        r, col = sq_row(s), sq_col(s)
        for d in dirs:
            ns = rc_to_sq(r + DR[d], col + DC[d])
            if ns >= 0 and ns not in board: return True
    return False

# =============================================================================
# Mkaguzi IPC process
# =============================================================================

class MkaguziProcess:
    def __init__(self, binary: str):
        self.proc = subprocess.Popen(
            [binary], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True
        )
        self._drain_init()
        self._send({"type": "setVariant", "variant": "tanzania"})

    def _drain_init(self):
        import platform
        if platform.system() == 'Windows':
            self.proc.stdout.readline()
        else:
            import select
            while True:
                r, _, _ = select.select([self.proc.stdout], [], [], 0.1)
                if not r: break
                line = self.proc.stdout.readline()
                if not line: break

    def _send(self, msg: dict):
        self.proc.stdin.write(json.dumps(msg) + '\n')
        self.proc.stdin.flush()

    def get_move(self, fen: str, depth: int, time_ms: int) -> Optional[str]:
        self._send({"type": "setPosition", "fen": fen})
        self._send({"type": "go", "depth": depth, "timeMs": time_ms, "multiPV": 1})
        while True:
            line = self.proc.stdout.readline().strip()
            if not line: return None
            try:
                msg = json.loads(line)
                if msg.get("type") == "bestmove": return msg.get("move")
            except json.JSONDecodeError:
                continue

    def close(self):
        try:
            self._send({"type": "quit"})
            self.proc.wait(timeout=3)
        except Exception:
            self.proc.kill()

# =============================================================================
# Feature extraction  (must exactly match C++ eval, white-relative)
# =============================================================================

# Named constant indices:
# 0  man_diff          MAN_VALUE          100
# 1  king_diff         KING_VALUE         300
# 2  tempo             TEMPO_BONUS         10
# 3  mobility          MOBILITY_SCALE       3
# 4  center_ctrl       CENTER_CTRL_BONUS    8
# 5  advancement       ADVANCE_BONUS        3
# 6  isolation         ISOLATION_PENALTY   10
# 7  double_corner     DOUBLE_CORNER_BONUS 20
# 8  back_rank         BACK_RANK_BONUS     15
# 9  chains            CHAIN_BONUS         12
# 10 promo_threat      PROMO_THREAT_BONUS  25
# 11 center_cluster    CENTER_CLUSTER_BONUS 10
# 12 supp_promo        SUPP_PROMO_BONUS    20
# 13 blocked_men       BLOCKED_MAN_PENALTY  8
# 14 king_trap_p8      KING_TRAP_EDGE_PENALTY 25
# 15 king_center       KING_CENTER_BONUS   20
# 16 king_edge         KING_EDGE_PENALTY   10
# 17 king_trap_ks      KING_TRAPPED_PENALTY 30
# 18 window_coh        WINDOW_COHESION_BONUS 6

FEATURE_NAMES = [
    'man_diff', 'king_diff', 'tempo', 'mobility',
    'center_ctrl', 'advancement', 'isolation',
    'double_corner', 'back_rank', 'chains', 'promo_threat',
    'center_cluster', 'supp_promo', 'blocked_men', 'king_trap_p8',
    'king_center', 'king_edge', 'king_trap_ks', 'window_coh',
]

INIT_WEIGHTS = np.array([100, 300, 10, 3, 8, 3, 10, 20, 15, 12, 25, 10, 20, 8, 25, 20, 10, 30, 6],
                        dtype=float)

# Board squares for reference
CENTER_4    = {13, 14, 17, 18}
WBACK       = {28, 29, 30, 31}
BBACK       = {0,  1,  2,  3}
CENTER8     = set(range(12, 20))
EDGE_SET    = {0,1,2,3,28,29,30,31,4,8,12,16,20,24,7,11,15,19,23,27}
ROW1W       = {24,25,26,27}   # white row 1 (just before promotion)
ROW6W       = {4, 5, 6, 7}   # white row 6 (one step from promotion)
ROW6B       = {4, 5, 6, 7}   # black row 6 (just before promotion — same sqs, mirrored)
ROW1B       = {24,25,26,27}  # black row 1 (one step from promotion)

# 3x3 windows
WINDOWS_LIST = [
    [28,24,21],[24,21,17],[31,26,22],[26,22,17],
    [0, 5, 9],[5, 9,14],[3, 7,10],[7,10,14],
    [13,14,17],[13,17,18],[14,17,18],[13,14,18],
]

def _ne(sq):
    return _STEP[sq][0]  # direction 0 = NE

def _nw(sq):
    return _STEP[sq][1]  # direction 1 = NW

def _se(sq):
    return _STEP[sq][2]  # direction 2 = SE

def _sw(sq):
    return _STEP[sq][3]  # direction 3 = SW

def extract_features(board: dict, side: str) -> np.ndarray:
    """Extract 19 white-relative features from a board position."""
    wm = {s for s,(c,t) in board.items() if c=='w' and t=='m'}
    wk = {s for s,(c,t) in board.items() if c=='w' and t=='k'}
    bm = {s for s,(c,t) in board.items() if c=='b' and t=='m'}
    bk = {s for s,(c,t) in board.items() if c=='b' and t=='k'}
    occ = wm | wk | bm | bk

    f = np.zeros(19, dtype=float)

    # 0: man_diff
    f[0] = len(wm) - len(bm)

    # 1: king_diff
    f[1] = len(wk) - len(bk)

    # 2: tempo  (white-relative: +1 if white to move, -1 if black)
    f[2] = 1.0 if side == 'w' else -1.0

    # 3: mobility  (white_open - black_open)
    empty = set(range(32)) - occ
    wmob = sum(1 for s in wm for d in [0,1] if _STEP[s][d] is not None and _STEP[s][d] >= 0 and _STEP[s][d] in empty)
    wmob += sum(1 for s in wk for d in range(4) if _STEP[s][d] is not None and _STEP[s][d] >= 0 and _STEP[s][d] in empty)
    bmob = sum(1 for s in bm for d in [2,3] if _STEP[s][d] is not None and _STEP[s][d] >= 0 and _STEP[s][d] in empty)
    bmob += sum(1 for s in bk for d in range(4) if _STEP[s][d] is not None and _STEP[s][d] >= 0 and _STEP[s][d] in empty)
    f[3] = wmob - bmob

    # 4: center_ctrl  (pieces on CENTER_4)
    f[4] = len((wm|wk) & CENTER_4) - len((bm|bk) & CENTER_4)

    # 5: advancement  Σrow_wm - Σ(7-row)_bm
    f[5] = sum(sq_row(s) for s in wm) - sum(7 - sq_row(s) for s in bm)

    # 6: isolation  — isolated advanced men (bad for the isolated side)
    #   white man on row>=5 with no friendly behind = penalty for white → feature contribution negative
    #   black man on row<=2 with no friendly behind = penalty for black → feature contribution positive
    wiso = 0
    for s in wm:
        if sq_row(s) >= 5:
            r, c = sq_row(s), sq_col(s)
            has_behind = any(
                rc_to_sq(r - dr, c + dc) in wm
                for dr in [1, 2] for dc in [-1, 1]
                if 0 <= r - dr <= 7 and 0 <= c + dc <= 7
            )
            if not has_behind: wiso += 1
    biso = 0
    for s in bm:
        if sq_row(s) <= 2:
            r, c = sq_row(s), sq_col(s)
            has_behind = any(
                rc_to_sq(r + dr, c + dc) in bm
                for dr in [1, 2] for dc in [-1, 1]
                if 0 <= r + dr <= 7 and 0 <= c + dc <= 7
            )
            if not has_behind: biso += 1
    f[6] = biso - wiso  # positive = more isolated black → good for white

    # 7: double_corner  (sqs 28+29 or 30+31 for white; 0+1 or 2+3 for black)
    wdc = int((28 in wm and 29 in wm) or (30 in wm and 31 in wm))
    bdc = int((0  in bm and 1  in bm) or (2  in bm and 3  in bm))
    f[7] = wdc - bdc

    # 8: back_rank  (all 4 back-rank squares occupied by own men)
    f[8] = int(WBACK <= wm) - int(BBACK <= bm)

    # 9: chains  (3-connected men on same diagonal)
    def count_chains(men):
        n = 0
        for s in men:
            ne1 = _ne(s)
            if ne1 >= 0 and ne1 in men:
                ne2 = _ne(ne1)
                if ne2 >= 0 and ne2 in men: n += 1
            nw1 = _nw(s)
            if nw1 >= 0 and nw1 in men:
                nw2 = _nw(nw1)
                if nw2 >= 0 and nw2 in men: n += 1
        return n
    f[9] = count_chains(wm) - count_chains(bm)

    # 10: promo_threat  (man on penultimate row with empty promotion square)
    wpt = 0
    for s in wm & ROW1W:
        ne, nw = _ne(s), _nw(s)
        ne_blocked = ne < 0 or ne in occ
        nw_blocked = nw < 0 or nw in occ
        if not ne_blocked or not nw_blocked: wpt += 1
    bpt = 0
    for s in bm & ROW6B:
        se, sw_ = _se(s), _sw(s)
        se_blocked = se < 0 or se in occ
        sw_blocked = sw_ < 0 or sw_ in occ
        if not se_blocked or not sw_blocked: bpt += 1
    f[10] = wpt - bpt

    # 11: center_cluster  (2+ men in center 8 squares)
    f[11] = int(len(wm & CENTER8) >= 2) - int(len(bm & CENTER8) >= 2)

    # 12: supp_promo  (white on row6 with SE/SW friendly; black on row1 with NE/NW friendly)
    wsp = 0
    for s in wm & ROW6W:
        se, sw_ = _se(s), _sw(s)
        if (se >= 0 and se in wm) or (sw_ >= 0 and sw_ in wm): wsp += 1
    bsp = 0
    for s in bm & ROW1B:
        ne, nw = _ne(s), _nw(s)
        if (ne >= 0 and ne in bm) or (nw >= 0 and nw in bm): bsp += 1
    f[12] = wsp - bsp

    # 13: blocked_men  (both forward squares occupied by own pieces)
    wfr = wm | wk;  bfr = bm | bk
    wblk = sum(1 for s in wm if
               (_ne(s) < 0 or _ne(s) in wfr) and
               (_nw(s) < 0 or _nw(s) in wfr))
    bblk = sum(1 for s in bm if
               (_se(s) < 0 or _se(s) in bfr) and
               (_sw(s) < 0 or _sw(s) in bfr))
    f[13] = bblk - wblk  # positive = more blocked black = good for white

    # 14: king_trap_p8  (king on EDGE with >=2 enemy adj)
    wall_dirs = [0,1,2,3]
    def king_trapped_edge(kings, enemy):
        n = 0
        for s in kings & EDGE_SET:
            adj_enemy = sum(1 for d in wall_dirs
                           if _STEP[s][d] >= 0 and _STEP[s][d] in enemy)
            if adj_enemy >= 2: n += 1
        return n
    wenemy = bm | bk;  benemy = wm | wk
    f[14] = king_trapped_edge(bk, benemy) - king_trapped_edge(wk, wenemy)

    # 15: king_center  (kings on CENTER_4)
    f[15] = len(wk & CENTER_4) - len(bk & CENTER_4)

    # 16: king_edge  (kings on EDGE — penalty for own, bonus vs opponent)
    f[16] = len(bk & EDGE_SET) - len(wk & EDGE_SET)  # positive = more bk on edge = good for white

    # 17: king_trap_ks  (king on back rank with all neighbors occupied)
    def king_trapped_backrow(kings):
        n = 0
        for s in kings:
            adj = [_STEP[s][d] for d in wall_dirs if _STEP[s][d] >= 0]
            if adj and all(a in occ for a in adj): n += 1
        return n
    wkt_back = king_trapped_backrow(wk & WBACK)
    bkt_back = king_trapped_backrow(bk & BBACK)
    f[17] = bkt_back - wkt_back

    # 18: window_coh  (number of all-white windows minus all-black windows)
    wc_windows = 0
    bc_windows = 0
    for w in WINDOWS_LIST:
        states = []
        for sq in w:
            if sq in wm:    states.append(1)
            elif sq in wk:  states.append(2)
            elif sq in bm:  states.append(3)
            elif sq in bk:  states.append(4)
            else:           states.append(0)
        wCnt = sum(1 for s in states if s in (1, 2))
        bCnt = sum(1 for s in states if s in (3, 4))
        if wCnt == 3: wc_windows += 1
        if bCnt == 3: bc_windows += 1
    f[18] = wc_windows - bc_windows

    return f

# =============================================================================
# Position generator (mkaguzi vs sidra for outcome diversity)
# =============================================================================

MAX_HALFMOVES    = 200
DRAW_NO_PROGRESS = 80

def ask_sidra(sidra_path: str, board: dict, side: str, time_ms: int) -> Optional[dict]:
    """One-shot Sidra call. Returns parsed JSON or None."""
    pieces = [
        {"type": "KING" if t == 'k' else "MAN",
         "color": "WHITE" if c == 'w' else "BLACK",
         "position": pdn(s)}
        for s, (c, t) in board.items()
    ]
    payload = json.dumps({
        "currentPlayer": "WHITE" if side == 'w' else "BLACK",
        "timeLimitMs": time_ms,
        "pieces": pieces
    })
    try:
        r = subprocess.run([sidra_path], input=payload, capture_output=True,
                           text=True, timeout=time_ms / 1000 + 10)
        if r.returncode != 0: return None
        lines = [l.strip() for l in r.stdout.splitlines() if l.strip()]
        if not lines: return None
        return json.loads(lines[-1])
    except Exception:
        return None


def _play_one_game(mkaguzi: MkaguziProcess, sidra_path: str,
                   mk_side: str, depth: int, time_ms: int,
                   sample_every: int, verbose: bool):
    """
    Play one game (mkaguzi vs sidra), returning (result, game_positions).
    result: 'w' | 'b' | 'draw'.
    game_positions: list of (board_dict, side_to_move) sampled every sample_every half-moves.
    """
    board = starting_board()
    turn = 'w'
    no_progress = 0
    position_history: dict = {}
    game_positions = []
    result = None

    for half in range(MAX_HALFMOVES):
        if not has_legal_moves(board, turn):
            result = 'b' if turn == 'w' else 'w'
            break
        if no_progress >= DRAW_NO_PROGRESS:
            result = 'draw'
            break

        fen = board_to_fen(board, turn)
        position_history[fen] = position_history.get(fen, 0) + 1
        if position_history[fen] >= 3:
            result = 'draw'
            break

        # Collect position (skip opening 8 half-moves; skip tiny endgame)
        if half >= 8 and half % sample_every == 0 and len(board) >= 4:
            game_positions.append((dict(board), turn))

        if turn == mk_side:
            move_str = mkaguzi.get_move(fen, depth, time_ms)
            if not move_str or len(move_str) < 4:
                result = 'b' if turn == 'w' else 'w'
                break
            fp, tp = int(move_str[:2]), int(move_str[2:4])
        else:
            res = ask_sidra(sidra_path, board, turn, time_ms)
            if not res or res.get('from', -1) < 0:
                result = 'b' if turn == 'w' else 'w'
                break
            fp, tp = res['from'], res['to']

        if verbose:
            mover = 'mkaguzi' if turn == mk_side else 'sidra  '
            print(f"    {mover} ({turn}): {fp:02d}--{tp:02d}")

        enemy_before = sum(1 for c, _ in board.values() if c != turn)
        apply_move(board, fp, tp, turn)
        enemy_after  = sum(1 for c, _ in board.values() if c != turn)
        no_progress = 0 if enemy_after < enemy_before else no_progress + 1
        turn = 'b' if turn == 'w' else 'w'

    if result is None:
        result = 'draw'
    return result, game_positions


def collect_positions(mkaguzi: MkaguziProcess, sidra_path: str,
                      n_games: int, depth: int, time_ms: int,
                      sample_every: int = 3, verbose: bool = False,
                      weak_depth: int = 1):
    """
    Play n_games of mkaguzi vs sidra (alternating colours), collecting
    (feature_vec, outcome) pairs labelled with the game result.
    outcome: 1.0 = white wins, 0.5 = draw, 0.0 = black wins.

    To ensure balanced outcome distribution (wins/draws/losses), every other
    game is a 'handicap' game where mkaguzi plays at weak_depth (default 1-ply).
    This generates positions where sidra wins, providing 0.0 outcome examples.
    """
    positions = []
    wins = draws = losses = 0
    wdl_counts = {1.0: 0, 0.5: 0, 0.0: 0}

    for g in range(n_games):
        mk_side  = 'w' if g % 2 == 1 else 'b'      # alternate colours
        # Alternate full-strength and handicap games for outcome diversity
        use_depth = weak_depth if g % 4 < 2 else depth   # 2 handicap, 2 full per cycle

        result, game_positions = _play_one_game(
            mkaguzi, sidra_path, mk_side, use_depth, time_ms, sample_every, verbose)

        outcome = 1.0 if result == 'w' else (0.0 if result == 'b' else 0.5)
        wdl_counts[outcome] += len(game_positions)
        for brd, side in game_positions:
            positions.append((extract_features(brd, side), outcome))

        if   result == mk_side:  wins   += 1; tag = 'W'
        elif result == 'draw':   draws  += 1; tag = 'D'
        else:                    losses += 1; tag = 'L'

        depth_tag = f'd={use_depth}'
        if verbose or (g + 1) % 10 == 0:
            print(f"  Game {g+1:3}/{n_games} [{tag}][{depth_tag}]  "
                  f"{wins}W {draws}D {losses}L  "
                  f"1.0:{wdl_counts[1.0]}  0.5:{wdl_counts[0.5]}  0.0:{wdl_counts[0.0]}  "
                  f"total:{len(positions)}")

    return positions

# =============================================================================
# Texel loss and optimiser
# =============================================================================

TEXEL_K = 400.0   # sigmoid scale (centipawns)
LAMBDA  = 1e-4    # L2 regularization: keeps weights near INIT_WEIGHTS

# Features whose weights are FIXED (not tuned).
# Material values (0=man_diff, 1=king_diff) are well-established by game theory
# and must not be changed by Texel tuning — small datasets cannot reliably tune them.
FIXED_FEATURES = {0, 1}   # MAN_VALUE, KING_VALUE

def _bounds_for(i, w0):
    if i in FIXED_FEATURES:
        return (float(w0), float(w0))   # pinned — no movement
    # Positional: [25% of init, 600% of init], floored at 1
    return (max(1.0, 0.25 * w0), max(10.0, 6.0 * w0))

WEIGHT_BOUNDS = [_bounds_for(i, w0) for i, w0 in enumerate(INIT_WEIGHTS)]

def sigmoid(x):
    return np.where(x >= 0,
                    1.0 / (1.0 + np.exp(-x)),
                    np.exp(x) / (1.0 + np.exp(x)))

def mse_loss(w, F, y):
    """MSE + L2 penalty anchoring weights near INIT_WEIGHTS."""
    pred  = sigmoid(F @ w / TEXEL_K)
    diff  = pred - y
    mse   = float(np.mean(diff * diff))
    # Normalise penalty by typical weight magnitude so it's scale-invariant
    delta = (w - INIT_WEIGHTS) / (INIT_WEIGHTS + 1.0)
    reg   = LAMBDA * float(np.mean(delta * delta))
    return mse + reg

def mse_grad(w, F, y):
    pred  = sigmoid(F @ w / TEXEL_K)
    diff  = pred - y
    scale = (2.0 / len(y)) * diff * pred * (1.0 - pred) / TEXEL_K
    grad_mse = F.T @ scale
    # Gradient of L2 penalty
    grad_reg = (2.0 * LAMBDA / len(INIT_WEIGHTS)) * (w - INIT_WEIGHTS) / (INIT_WEIGHTS + 1.0) ** 2
    return grad_mse + grad_reg

def tune_weights(positions, init_weights):
    F = np.array([f for f, _ in positions])
    y = np.array([o for _, o in positions])

    print(f"\n  Dataset:      {len(positions)} positions, {F.shape[1]} features")
    print(f"  Outcome dist: {np.sum(y==1.0):.0f} white-wins  "
          f"{np.sum(y==0.5):.0f} draws  {np.sum(y==0.0):.0f} black-wins")
    print(f"  Initial loss: {mse_loss(init_weights, F, y):.6f}")

    result = minimize(
        fun=mse_loss,
        x0=init_weights.copy(),
        args=(F, y),
        jac=mse_grad,
        method='L-BFGS-B',
        bounds=WEIGHT_BOUNDS,
        options={'maxiter': 3000, 'ftol': 1e-12, 'gtol': 1e-9, 'disp': False},
    )

    tuned = result.x
    print(f"  Final   loss: {mse_loss(tuned, F, y):.6f}  (iters={result.nit})")
    return tuned

# =============================================================================
# C++ source patching
# =============================================================================

# Maps feature index → (relative path from engines/core/src, constant name)
PATCHES = [
    (0,  'eval/eval.h',          'MAN_VALUE'),
    (1,  'eval/eval.h',          'KING_VALUE'),
    (2,  'eval/eval.h',          'TEMPO_BONUS'),
    (3,  'eval/mobility.cpp',    'MOBILITY_SCALE'),
    (4,  'eval/structure.cpp',   'CENTER_CTRL_BONUS'),
    (5,  'eval/structure.cpp',   'ADVANCE_BONUS'),
    (6,  'eval/structure.cpp',   'ISOLATION_PENALTY'),
    (7,  'eval/patterns.cpp',    'DOUBLE_CORNER_BONUS'),
    (8,  'eval/patterns.cpp',    'BACK_RANK_BONUS'),
    (9,  'eval/patterns.cpp',    'CHAIN_BONUS'),
    (10, 'eval/patterns.cpp',    'PROMO_THREAT_BONUS'),
    (11, 'eval/patterns.cpp',    'CENTER_CLUSTER_BONUS'),
    (12, 'eval/patterns.cpp',    'SUPP_PROMO_BONUS'),
    (13, 'eval/patterns.cpp',    'BLOCKED_MAN_PENALTY'),
    (14, 'eval/patterns.cpp',    'KING_TRAP_EDGE_PENALTY'),
    (15, 'eval/king_safety.cpp', 'KING_CENTER_BONUS'),
    (16, 'eval/king_safety.cpp', 'KING_EDGE_PENALTY'),
    (17, 'eval/king_safety.cpp', 'KING_TRAPPED_PENALTY'),
    (18, 'eval/patterns.cpp',    'WINDOW_COHESION_BONUS'),
]

def patch_source(src_root: str, tuned_weights: np.ndarray, dry_run: bool = False):
    """Replace constexpr int NAME = OLD; with NAME = NEW; in C++ sources."""
    for idx, rel_path, const_name in PATCHES:
        new_val = max(1, int(round(float(tuned_weights[idx]))))  # floor at 1
        full_path = os.path.join(src_root, rel_path)
        if not os.path.exists(full_path):
            print(f"  WARN: {full_path} not found — skipping {const_name}")
            continue

        with open(full_path, 'r') as fh:
            text = fh.read()

        # Match:  constexpr int NAME = NUMBER;
        pattern = rf'(constexpr\s+int\s+{re.escape(const_name)}\s*=\s*)(\d+)(\s*;)'
        m = re.search(pattern, text)
        if not m:
            print(f"  WARN: {const_name} not found in {rel_path}")
            continue

        old_val = int(m.group(2))
        new_text = re.sub(pattern, rf'\g<1>{new_val}\3', text)
        delta = new_val - old_val
        sign = '+' if delta >= 0 else ''
        print(f"  {const_name:30s}  {old_val:4d} -> {new_val:4d}  ({sign}{delta})")

        if not dry_run:
            with open(full_path, 'w') as fh:
                fh.write(new_text)

# =============================================================================
# Rebuild helper
# =============================================================================

def rebuild(build_dir: str) -> bool:
    """Run cmake --build in build_dir. Returns True on success."""
    cmake_candidates = [
        r'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe',
        r'C:\Program Files\CMake\bin\cmake.exe',
        'cmake',
    ]
    cmake = next((c for c in cmake_candidates if os.path.exists(c)), 'cmake')
    cmd = [cmake, '--build', build_dir, '--config', 'Debug', '--target', 'mkaguzi']
    print(f"\n  Building: {' '.join(cmd)}")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("  BUILD FAILED:")
        print(r.stdout[-3000:])
        print(r.stderr[-2000:])
        return False
    print("  Build succeeded.")
    return True

# =============================================================================
# Main
# =============================================================================

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    core_root  = os.path.normpath(os.path.join(here, '..'))
    src_root   = os.path.join(core_root, 'src')
    build_dir  = os.path.join(core_root, 'build_mkaguzi')
    repo_root  = os.path.normpath(os.path.join(core_root, '..', '..'))

    ap = argparse.ArgumentParser(description='Texel tuner for Mkaguzi')
    ap.add_argument('--games',   type=int,  default=80,   help='Games to play (default 80)')
    ap.add_argument('--depth',   type=int,  default=4,    help='Mkaguzi search depth (default 4)')
    ap.add_argument('--time',    type=int,  default=200,  help='ms per move (default 200)')
    ap.add_argument('--sample',  type=int,  default=3,    help='Sample every N half-moves (default 3)')
    ap.add_argument('--weak-depth', type=int, default=1,   help='Handicap depth for loss generation (default 1)')
    ap.add_argument('--rebuild', action='store_true',      help='Rebuild after patching')
    ap.add_argument('--dry-run', action='store_true',      help='Print changes but do not write')
    ap.add_argument('--verbose', action='store_true',      help='Print each move')
    ap.add_argument('--mkaguzi', default=os.path.join(build_dir, 'Debug', 'mkaguzi.exe'))
    ap.add_argument('--sidra',   default=os.path.join(repo_root, 'engines', 'sidra', 'cli', 'sidra-cli.exe'))
    args = ap.parse_args()

    mkaguzi_bin = os.path.normpath(args.mkaguzi)
    sidra_bin   = os.path.normpath(args.sidra)

    if not os.path.exists(mkaguzi_bin):
        print(f"ERROR: mkaguzi binary not found:\n  {mkaguzi_bin}")
        return 1
    if not os.path.exists(sidra_bin):
        print(f"ERROR: sidra-cli binary not found:\n  {sidra_bin}")
        print("  Texel tuning requires mkaguzi vs sidra games for outcome diversity.")
        print("  Pass --sidra <path> to specify the sidra-cli binary.")
        return 1

    print("=" * 62)
    print("  Texel tuner — Mkaguzi engine")
    print(f"  {args.games} games (mkaguzi vs sidra)  depth={args.depth}  {args.time}ms/move")
    print("=" * 62)

    # Phase 1: collect positions
    print("\nPhase 1: collecting positions from mkaguzi vs sidra …")
    t0 = time.time()
    engine = MkaguziProcess(mkaguzi_bin)
    try:
        positions = collect_positions(engine, sidra_bin, args.games, args.depth, args.time,
                                      sample_every=args.sample, verbose=args.verbose,
                                      weak_depth=args.weak_depth)
    finally:
        engine.close()

    print(f"  Collected {len(positions)} positions in {time.time()-t0:.1f}s")
    if len(positions) < 200:
        print("  WARNING: very few positions — results may be unreliable")

    # Phase 2: Texel optimisation
    print("\nPhase 2: L-BFGS-B optimisation …")
    tuned = tune_weights(positions, INIT_WEIGHTS)

    # Phase 3: report
    print("\nTuned weights:")
    print(f"  {'Feature':<30} {'Init':>6} {'Tuned':>7}  {'Delta':>6}")
    print("  " + "-" * 54)
    for i, name in enumerate(FEATURE_NAMES):
        init_v = INIT_WEIGHTS[i]
        tuned_v = tuned[i]
        delta = tuned_v - init_v
        sign = '+' if delta >= 0 else ''
        print(f"  {name:<30} {init_v:6.0f} {tuned_v:7.1f}  {sign}{delta:.1f}")

    # Phase 4: patch C++ sources
    print(f"\nPhase 4: {'[DRY RUN] ' if args.dry_run else ''}patching C++ constants …")
    patch_source(src_root, tuned, dry_run=args.dry_run)

    # Phase 5: rebuild
    if args.rebuild and not args.dry_run:
        print("\nPhase 5: rebuilding …")
        ok = rebuild(build_dir)
        return 0 if ok else 1

    if not args.rebuild:
        print("\n  (pass --rebuild to automatically rebuild after patching)")

    return 0

if __name__ == '__main__':
    sys.exit(main())
