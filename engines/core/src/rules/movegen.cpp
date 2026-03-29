#include "core/types.h"
#include "core/constants.h"
#include "core/bitboard.h"
#include "core/square_map.h"
#include "rules/variant.h"
#include "rules/promotion.h"
#include <algorithm>
#include <cstring>

// Stubs for specific generators (defined in capturegen.cpp)
void generateCaptures(const Position& pos, const RuleConfig& rules, Move* out, int& count);

// Forward declaration for quiet generator (defined later in this file)
void generateQuiets(const Position& pos, const RuleConfig& rules, Move* out, int& count);

// Top level generator dispatch
void generateMoves(const Position& pos, const RuleConfig& rules, Move* out, int& count) {
    count = 0;

    // In draughts, captures are mandatory
    generateCaptures(pos, rules, out, count);

    // If no captures generated, fall back to quiet moves
    if (count == 0) {
        generateQuiets(pos, rules, out, count);
    }

    // Keep only maximum-length capture sequences when the active rule pack
    // requires it. Tanzania and Russian can both use this through config.
    if (count > 0 && out[0].capLen > 0 &&
        (rules.maxCaptureRequired || rules.majorityCaptureMandatory)) {
        int maxCaps = 0;
        for (int i = 0; i < count; i++) {
            maxCaps = std::max(maxCaps, (int)out[i].capLen);
        }

        // Filter out any sequence that isn't the maximum length
        int retained = 0;
        for (int i = 0; i < count; i++) {
            if (out[i].capLen == maxCaps) {
                out[retained++] = out[i];
            }
        }
        count = retained;
    }
}

// Generate quiet (non-capture) moves.
// Tanzania: men move forward only (white=NE/NW, black=SE/SW); kings adjacent in all 4 dirs.
void generateQuiets(const Position& pos, const RuleConfig& rules, Move* out, int& count) {
    int side = pos.sideToMove;
    Bitboard myMen   = (side == 0) ? pos.whiteMen   : pos.blackMen;
    Bitboard myKings = (side == 0) ? pos.whiteKings : pos.blackKings;
    Bitboard occ     = pos.whiteMen | pos.whiteKings | pos.blackMen | pos.blackKings;
    Bitboard empty   = ~occ & 0xFFFFFFFF;

    // Men forward directions
    int manDirStart = (side == 0) ? 0 : 2;  // white: NE(0)/NW(1); black: SE(2)/SW(3)
    int manDirEnd   = manDirStart + 2;

    // Process men
    Bitboard men = myMen;
    while (men) {
        int sq = bsf(men);
        men &= men - 1;

        for (int d = manDirStart; d < manDirEnd; d++) {
            uint32_t adj = NE_MASK[sq]; // will be overridden below
            switch (d) {
                case 0: adj = NE_MASK[sq]; break;
                case 1: adj = NW_MASK[sq]; break;
                case 2: adj = SE_MASK[sq]; break;
                case 3: adj = SW_MASK[sq]; break;
            }
            if (!adj) continue;
            int toSq = bsf(adj);
            if (!((empty >> toSq) & 1)) continue;

            Move m;
            m.from    = (uint8_t)sq;
            m.to      = (uint8_t)toSq;
            m.pathLen = 0;
            m.capLen  = 0;
            m.promote = shouldPromote(toSq, side, false);
            m.score   = 0;
            out[count++] = m;
        }
    }

    // Kings: flying king (Art. 3.2) — slide any number of empty squares along each diagonal.
    // Short king fallback (non-TZD variants) uses the adjacent square only.
    Bitboard kings = myKings;
    while (kings) {
        int sq = bsf(kings);
        kings &= kings - 1;

        if (rules.kingsFly) {
            // Flying king: keep sliding until a piece blocks or the board edge is reached.
            for (int d = 0; d < 4; d++) {
                for (int i = 0; i < (int)DIAG_RAY_LEN[sq][d]; i++) {
                    int toSq = (int)DIAG_RAY[sq][d][i];
                    if (!((empty >> toSq) & 1)) break; // blocked — stop in this direction

                    Move m;
                    m.from    = (uint8_t)sq;
                    m.to      = (uint8_t)toSq;
                    m.pathLen = 0;
                    m.capLen  = 0;
                    m.promote = false;
                    m.score   = 0;
                    out[count++] = m;
                }
            }
        } else {
            // Short king: one adjacent square per direction.
            for (int d = 0; d < 4; d++) {
                uint32_t adj = 0;
                switch (d) {
                    case 0: adj = NE_MASK[sq]; break;
                    case 1: adj = NW_MASK[sq]; break;
                    case 2: adj = SE_MASK[sq]; break;
                    case 3: adj = SW_MASK[sq]; break;
                }
                if (!adj) continue;
                int toSq = bsf(adj);
                if (!((empty >> toSq) & 1)) continue;

                Move m;
                m.from    = (uint8_t)sq;
                m.to      = (uint8_t)toSq;
                m.pathLen = 0;
                m.capLen  = 0;
                m.promote = false;
                m.score   = 0;
                out[count++] = m;
            }
        }
    }
}
