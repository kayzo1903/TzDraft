#include "core/types.h"
#include "rules/variant.h"
#include "board/hash.h"

// Core make/unmake operations without heavy copying
void makeMove(Position& pos, const Move& m, Undo& undo, const RuleConfig& rules) {
    // 1. Pack current irreversible state
    undo.oldZobrist = pos.zobrist;
    undo.oldFiftyMove = pos.fiftyMove;
    undo.capturedWhiteMen   = 0;
    undo.capturedWhiteKings = 0;
    undo.capturedBlackMen   = 0;
    undo.capturedBlackKings = 0;

    // 2. Resolve side and pieces (bitwise toggle)
    Bitboard fromMask = (1U << m.from);
    Bitboard toMask   = (1U << m.to);

    // Incremental Zobrist update
    uint64_t& h = pos.zobrist;

    if (pos.sideToMove == 0) {
        if (pos.whiteMen & fromMask) {
            pos.whiteMen ^= (fromMask | toMask);
            if (m.promote) {
                // Man promoted: remove man at to, add king at to
                pos.whiteMen  &= ~toMask;
                pos.whiteKings |= toMask;
                h ^= ZOBRIST_PIECE[0][m.from];   // remove whiteMen from
                h ^= ZOBRIST_PIECE[1][m.to];     // add whiteKings to
            } else {
                h ^= ZOBRIST_PIECE[0][m.from];   // remove whiteMen from
                h ^= ZOBRIST_PIECE[0][m.to];     // add whiteMen to
            }
        } else if (pos.whiteKings & fromMask) {
            pos.whiteKings ^= (fromMask | toMask);
            h ^= ZOBRIST_PIECE[1][m.from];       // remove whiteKings from
            h ^= ZOBRIST_PIECE[1][m.to];         // add whiteKings to
        }
    } else {
        if (pos.blackMen & fromMask) {
            pos.blackMen ^= (fromMask | toMask);
            if (m.promote) {
                pos.blackMen  &= ~toMask;
                pos.blackKings |= toMask;
                h ^= ZOBRIST_PIECE[2][m.from];   // remove blackMen from
                h ^= ZOBRIST_PIECE[3][m.to];     // add blackKings to
            } else {
                h ^= ZOBRIST_PIECE[2][m.from];   // remove blackMen from
                h ^= ZOBRIST_PIECE[2][m.to];     // add blackMen to
            }
        } else if (pos.blackKings & fromMask) {
            pos.blackKings ^= (fromMask | toMask);
            h ^= ZOBRIST_PIECE[3][m.from];       // remove blackKings from
            h ^= ZOBRIST_PIECE[3][m.to];         // add blackKings to
        }
    }

    // 3. Remove captured pieces and update Zobrist
    for (int i = 0; i < m.capLen; i++) {
        int capSq = m.captures[i];
        Bitboard capMask = (1U << capSq);
        if (pos.sideToMove == 0) {
            if (pos.blackMen & capMask)   {
                pos.blackMen   &= ~capMask;
                undo.capturedBlackMen   |= capMask;
                h ^= ZOBRIST_PIECE[2][capSq];
            } else if (pos.blackKings & capMask) {
                pos.blackKings &= ~capMask;
                undo.capturedBlackKings |= capMask;
                h ^= ZOBRIST_PIECE[3][capSq];
            }
        } else {
            if (pos.whiteMen & capMask)   {
                pos.whiteMen   &= ~capMask;
                undo.capturedWhiteMen   |= capMask;
                h ^= ZOBRIST_PIECE[0][capSq];
            } else if (pos.whiteKings & capMask) {
                pos.whiteKings &= ~capMask;
                undo.capturedWhiteKings |= capMask;
                h ^= ZOBRIST_PIECE[1][capSq];
            }
        }
    }

    // 4. Toggle side to move
    h ^= ZOBRIST_SIDE;
    pos.sideToMove ^= 1;
    pos.ply++;
    pos.fullMove = pos.ply / 2 + 1;
    pos.fiftyMove = (m.capLen > 0 || m.promote) ? 0 : pos.fiftyMove + 1;
}

void unmakeMove(Position& pos, const Move& m, const Undo& undo) {
    pos.sideToMove ^= 1;
    pos.ply--;
    pos.fullMove = pos.ply / 2 + 1;

    Bitboard fromMask = (1U << m.from);
    Bitboard toMask   = (1U << m.to);

    // Swap back the moving piece
    if (pos.sideToMove == 0) {
        if (m.promote) {
            pos.whiteKings &= ~toMask;
            pos.whiteMen   |= fromMask;
        } else {
            if (pos.whiteMen & toMask)   { pos.whiteMen   ^= (fromMask | toMask); }
            else if (pos.whiteKings & toMask) { pos.whiteKings ^= (fromMask | toMask); }
        }
    } else {
        if (m.promote) {
            pos.blackKings &= ~toMask;
            pos.blackMen   |= fromMask;
        } else {
            if (pos.blackMen & toMask)   { pos.blackMen   ^= (fromMask | toMask); }
            else if (pos.blackKings & toMask) { pos.blackKings ^= (fromMask | toMask); }
        }
    }

    // Restore captured pieces from undo
    pos.whiteMen   |= undo.capturedWhiteMen;
    pos.whiteKings |= undo.capturedWhiteKings;
    pos.blackMen   |= undo.capturedBlackMen;
    pos.blackKings |= undo.capturedBlackKings;

    pos.zobrist   = undo.oldZobrist;
    pos.fiftyMove = undo.oldFiftyMove;
}
