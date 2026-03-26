#!/usr/bin/env bash
# Gauntlet runner — wraps gauntlet.py with sensible defaults.
# Run from the repo root:  bash engines/core/tuning/gauntlet.sh [args]
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python "$SCRIPT_DIR/gauntlet.py" "$@"
