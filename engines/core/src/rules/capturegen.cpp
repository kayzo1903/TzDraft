#include "rules/capturegen.h"
#include "rules/promotion.h"
#include "core/constants.h"
#include "core/bitboard.h"
#include <cstring>

// Recursive multi-jump capture generator.
//
// Tanzania rules:
//  - Men capture forward only (white: NE=0, NW=1; black: SE=2, SW=3)
//  - Kings capture in all 4 directions, land exactly 1 step beyond (no flying kings)
//  - Promotion during capture stops the sequence (menPromoteAndContinue=false)
//  - The same enemy piece cannot be captured twice in one sequence
//
// sq           - current square of the capturing piece
// isKing       - whether the piece is currently a king
// side         - 0=white, 1=black
// removedMask  - bitmask of enemy squares removed so far in this sequence
// partial      - move being built (from/path/captures already partially set)
// out          - output array
// count        - number of moves written so far

static void genCaptureFrom(
    const Position& pos,
    const RuleConfig& rules,
    uint8_t sq,
    bool isKing,
    int side,
    Bitboard removedMask,   // enemies already captured in this sequence
    Move& partial,
    Move* out,
    int& count)
{
    // Determine which squares are enemies and which are occupied
    Bitboard enemies;
    if (side == 0) {
        enemies = (pos.blackMen | pos.blackKings) & ~removedMask;
    } else {
        enemies = (pos.whiteMen | pos.whiteKings) & ~removedMask;
    }

    // Occupied squares excluding already-removed enemies
    // The jumping piece itself isn't in the occupied mask we use for landing checks.
    // Pieces already captured (removedMask) are considered vacated.
    Bitboard allPieces = (pos.whiteMen | pos.whiteKings | pos.blackMen | pos.blackKings) & ~removedMask;

    // Also remove the current square of the jumping piece from allPieces
    // so it doesn't block its own jump-over squares on multi-jumps
    allPieces &= ~(1U << sq);

    // Determine which directions to check
    // Men: white=NE(0),NW(1); black=SE(2),SW(3)
    // Kings: all 4 directions
    int dirStart = 0, dirEnd = 4;
    if (!isKing) {
        if (!rules.menCaptureBackward) {
            if (side == 0) { dirStart = 0; dirEnd = 2; }   // NE, NW
            else            { dirStart = 2; dirEnd = 4; }   // SE, SW
        }
    }

    bool foundFurther = false;

    for (int d = dirStart; d < dirEnd; d++) {
        uint32_t over = JUMP_OVER[sq][d];
        uint32_t land = JUMP_LAND[sq][d];

        if (over == 0xFF || land == 0xFF) continue; // off board

        Bitboard overMask = (1U << over);
        Bitboard landMask = (1U << land);

        // Enemy must be on the over square and landing must be empty
        if (!(enemies & overMask)) continue;
        if (allPieces & landMask) continue;

        foundFurther = true;

        // Extend the sequence
        Bitboard newRemoved = removedMask | overMask;

        // Record capture and path step
        int savedCapLen  = partial.capLen;
        int savedPathLen = partial.pathLen;
        bool savedPromote = partial.promote;

        partial.captures[partial.capLen++] = (uint8_t)over;
        partial.path[partial.pathLen++]    = (uint8_t)land;

        // Check promotion: only applies to men landing on promotion rank
        bool promoted = shouldPromote((int)land, side, isKing);
        if (promoted) partial.promote = true;

        // Tanzania: if a man promotes during a capture, the sequence ends immediately
        bool canContinue = !promoted || rules.menPromoteAndContinue;

        if (canContinue) {
            // Recurse: try to extend the sequence from the landing square
            genCaptureFrom(pos, rules, (uint8_t)land, isKing || promoted,
                           side, newRemoved, partial, out, count);
        } else {
            // Promotion stops the sequence — commit this partial move now
            if (partial.capLen > 0 && count < MAX_MOVES) {
                partial.to = (uint8_t)land;
                out[count++] = partial;
            }
        }

        // Undo extension (backtrack)
        partial.capLen  = savedCapLen;
        partial.pathLen = savedPathLen;
        partial.promote = savedPromote;
    }

    if (!foundFurther) {
        // This is a leaf node: commit the partial move
        if (partial.capLen > 0 && count < 256) {
            // The 'to' square is the last square in the path
            partial.to = partial.path[partial.pathLen - 1];
            out[count++] = partial;
        }
    }
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

        // Build an initial partial move; zero the whole struct so no stale
        // capture/path data from a previous branch can leak into committed moves.
        Move partial;
        memset(&partial, 0, sizeof(partial));
        partial.from    = (uint8_t)sq;
        partial.to      = (uint8_t)sq;

        genCaptureFrom(pos, rules, (uint8_t)sq, isKing, side,
                       0, partial, out, count);
    }
}
