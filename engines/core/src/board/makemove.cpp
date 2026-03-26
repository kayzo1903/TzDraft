#include "core/types.h"
#include "rules/variant.h"

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

    if (pos.sideToMove == 0) {
        if (pos.whiteMen & fromMask) { pos.whiteMen ^= (fromMask | toMask); }
        else if (pos.whiteKings & fromMask) { pos.whiteKings ^= (fromMask | toMask); }
        // Handle promotion
        if (m.promote) {
            pos.whiteMen  &= ~toMask;
            pos.whiteKings |= toMask;
        }
    } else {
        if (pos.blackMen & fromMask) { pos.blackMen ^= (fromMask | toMask); }
        else if (pos.blackKings & fromMask) { pos.blackKings ^= (fromMask | toMask); }
        // Handle promotion
        if (m.promote) {
            pos.blackMen  &= ~toMask;
            pos.blackKings |= toMask;
        }
    }

    // 3. Remove captured pieces based on m.captures
    for (int i = 0; i < m.capLen; i++) {
        Bitboard capMask = (1U << m.captures[i]);
        if (pos.sideToMove == 0) {
            if (pos.blackMen & capMask)   { pos.blackMen   &= ~capMask; undo.capturedBlackMen   |= capMask; }
            if (pos.blackKings & capMask) { pos.blackKings &= ~capMask; undo.capturedBlackKings |= capMask; }
        } else {
            if (pos.whiteMen & capMask)   { pos.whiteMen   &= ~capMask; undo.capturedWhiteMen   |= capMask; }
            if (pos.whiteKings & capMask) { pos.whiteKings &= ~capMask; undo.capturedWhiteKings |= capMask; }
        }
    }

    pos.sideToMove ^= 1;
    pos.ply++;
    pos.fiftyMove = (m.capLen > 0 || m.promote) ? 0 : pos.fiftyMove + 1;
}

void unmakeMove(Position& pos, const Move& m, const Undo& undo) {
    pos.sideToMove ^= 1;
    pos.ply--;

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
