#include "rules/capturegen.h"
#include "rules/promotion.h"
#include "core/constants.h"
#include "core/bitboard.h"
#include "core/square_map.h"
#include <cstring>

// Recursive multi-jump capture generator.
//
// Tanzania rules (Art. 4):
//  - Men capture forward only (white: NE=0, NW=1; black: SE=2, SW=3)
//  - Kings: flying king — scan the diagonal for first enemy, land on any empty square beyond
//  - Promotion during capture stops the sequence (menPromoteAndContinue=false)
//  - Same enemy cannot be captured twice in one sequence (Turkish strike, Art. 4.7)
//  - Captured pieces remain physically on the board until sequence ends (Art. 4.4)
//    → they block landing squares but cannot be re-captured
//
// sq           - current square of the capturing piece
// isKing       - whether the piece is currently a king
// side         - 0=white, 1=black
// removedMask  - bitmask of enemy squares already captured in this sequence
// partial      - move being built
// out          - output array
// count        - number of moves written so far

static bool genCaptureFrom(
    const Position& pos,
    const RuleConfig& rules,
    uint8_t sq,
    bool isKing,
    int side,
    Bitboard removedMask,
    Move& partial,
    Move* out,
    int& count)
{
    // Enemies that can still be captured (not yet taken in this sequence)
    Bitboard enemies;
    if (side == 0) {
        enemies = (pos.blackMen | pos.blackKings) & ~removedMask;
    } else {
        enemies = (pos.whiteMen | pos.whiteKings) & ~removedMask;
    }

    // Blocking occupancy: all pieces on board minus the jumping piece.
    // Art. 4.4: captured pieces remain physically until sequence ends → they stay in
    // this mask and block landing/passing squares even after being captured.
    Bitboard blocking = (pos.whiteMen | pos.whiteKings | pos.blackMen | pos.blackKings)
                        & ~(1U << sq);

    // Direction limits
    int dirStart = 0, dirEnd = 4;
    if (!isKing && !rules.menCaptureBackward) {
        if (side == 0) { dirStart = 0; dirEnd = 2; }  // white men: NE, NW
        else            { dirStart = 2; dirEnd = 4; }  // black men: SE, SW
    }

    bool foundFurther = false;

    for (int d = dirStart; d < dirEnd; d++) {
        if (isKing && rules.kingsFly) {
            // ── Flying king capture (Art. 4.3, 4.6) ──────────────────────────────
            // Step 1: scan the diagonal to find the first enemy piece.
            //         Stop at any blocking piece (own or previously-captured enemy).
            int enemySq  = -1;
            int enemyIdx = -1;
            for (int i = 0; i < (int)DIAG_RAY_LEN[sq][d]; i++) {
                int rsq = (int)DIAG_RAY[sq][d][i];
                if (blocking & (1U << rsq)) {
                    if (enemies & (1U << rsq)) {
                        enemySq  = rsq;
                        enemyIdx = i;
                    }
                    break; // blocked — stop regardless
                }
            }
            if (enemySq < 0) continue; // no capturable enemy this way

            Bitboard overMask   = 1U << enemySq;
            Bitboard newRemoved = removedMask | overMask;

            // Step 2: enumerate every empty landing square beyond the captured enemy.
            //         Stop at the next blocking piece (Art. 4.3: land on any free square
            //         beyond the captured piece).
            for (int i = enemyIdx + 1; i < (int)DIAG_RAY_LEN[sq][d]; i++) {
                int land = (int)DIAG_RAY[sq][d][i];
                // blocking still contains the captured enemy, but we're past its index
                // and landing on squares beyond it — check the remaining ray for blockers.
                if (blocking & (1U << land)) break; // blocked — no further landing

                foundFurther = true;

                int  savedCapLen  = partial.capLen;
                int  savedPathLen = partial.pathLen;
                bool savedPromote = partial.promote;

                partial.captures[partial.capLen++] = (uint8_t)enemySq;
                partial.path[partial.pathLen++]    = (uint8_t)land;
                // Kings don't re-promote

                // Recurse: try more captures from this landing square.
                // If this landing forces continuation, any later landing square
                // beyond it would illegally bypass that obligation (TZD Art. 4.6).
                bool forcedContinuation =
                    genCaptureFrom(pos, rules, (uint8_t)land, true, side,
                                   newRemoved, partial, out, count);

                partial.capLen  = savedCapLen;
                partial.pathLen = savedPathLen;
                partial.promote = savedPromote;

                if (forcedContinuation) {
                    break;
                }
            }
        } else {
            // ── Man (or short-king) capture: fixed one-step-over, one-step-land ──
            uint32_t over = JUMP_OVER[sq][d];
            uint32_t land = JUMP_LAND[sq][d];

            if (over == 0xFF || land == 0xFF) continue; // off board

            Bitboard overMask = 1U << over;
            Bitboard landMask = 1U << land;

            if (!(enemies & overMask)) continue;   // no capturable enemy here
            if (blocking & landMask)   continue;   // landing occupied

            foundFurther = true;

            Bitboard newRemoved = removedMask | overMask;

            int  savedCapLen  = partial.capLen;
            int  savedPathLen = partial.pathLen;
            bool savedPromote = partial.promote;

            partial.captures[partial.capLen++] = (uint8_t)over;
            partial.path[partial.pathLen++]    = (uint8_t)land;

            bool promoted = shouldPromote((int)land, side, isKing);
            if (promoted) partial.promote = true;

            // Art. 4.10: promotion during capture ends the sequence immediately
            bool canContinue = !promoted || rules.menPromoteAndContinue;

            if (canContinue) {
                genCaptureFrom(pos, rules, (uint8_t)land, isKing || promoted,
                               side, newRemoved, partial, out, count);
            } else {
                // Promotion stops — commit now
                if (partial.capLen > 0 && count < 256) {
                    partial.to = (uint8_t)land;
                    out[count++] = partial;
                }
            }

            partial.capLen  = savedCapLen;
            partial.pathLen = savedPathLen;
            partial.promote = savedPromote;
        }
    }

    if (!foundFurther) {
        // Leaf node: commit the completed capture sequence
        if (partial.capLen > 0 && count < 256) {
            partial.to = partial.path[partial.pathLen - 1];
            out[count++] = partial;
        }
    }

    return foundFurther;
}

void generateCaptures(const Position& pos, const RuleConfig& rules, Move* out, int& count) {
    int side = pos.sideToMove;
    Bitboard myMen   = (side == 0) ? pos.whiteMen   : pos.blackMen;
    Bitboard myKings = (side == 0) ? pos.whiteKings : pos.blackKings;

    // Iterate over all pieces of the side to move
    Bitboard pieces = myMen | myKings;
    while (pieces) {
        int sq = bsf(pieces);
        pieces &= pieces - 1;

        bool isKing = (myKings >> sq) & 1;

        // Build an initial partial move
        Move partial;
        partial.from    = (uint8_t)sq;
        partial.to      = (uint8_t)sq;
        partial.pathLen = 0;
        partial.capLen  = 0;
        partial.promote = false;
        partial.score   = 0;

        genCaptureFrom(pos, rules, (uint8_t)sq, isKing, side,
                       0, partial, out, count);
    }
}
