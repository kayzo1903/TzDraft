#include "board/fen.h"
#include "board/position.h"
#include "board/hash.h"
#include <cctype>
#include <string>

Position parseFen(const std::string& fen) {
    Position pos;
    pos.whiteMen = pos.whiteKings = pos.blackMen = pos.blackKings = 0;
    pos.sideToMove = 0;
    pos.ply = 0;
    pos.fiftyMove = 0;
    pos.fullMove = 1;
    pos.zobrist = 0;

    if (fen.empty()) {
        initPosition(pos);
        pos.zobrist = computeHash(pos);
        return pos;
    }

    const char* p = fen.c_str();

    // Side to move
    if (*p == 'W' || *p == 'w') { pos.sideToMove = 0; p++; }
    else if (*p == 'B' || *p == 'b') { pos.sideToMove = 1; p++; }

    // Consume up to first ':'
    while (*p && *p != ':') p++;

    // Parse color sections
    while (*p == ':') {
        p++;  // skip ':'
        int pieceColor = -1;
        if      (*p == 'W' || *p == 'w') { pieceColor = 0; p++; }
        else if (*p == 'B' || *p == 'b') { pieceColor = 1; p++; }
        else continue;

        while (*p && *p != ':') {
            bool isKing = false;
            if (*p == 'K' || *p == 'k') { isKing = true; p++; }

            if (!isdigit((unsigned char)*p)) { p++; continue; }
            int sq = 0;
            while (*p && isdigit((unsigned char)*p)) {
                sq = sq * 10 + (*p - '0');
                p++;
            }
            sq--;  // PDN 1-based → 0-based

            if (sq >= 0 && sq < 32) {
                Bitboard mask = (1U << sq);
                if (pieceColor == 0) {
                    if (isKing) pos.whiteKings |= mask;
                    else        pos.whiteMen   |= mask;
                } else {
                    if (isKing) pos.blackKings |= mask;
                    else        pos.blackMen   |= mask;
                }
            }

            if (*p == ',') p++;
        }
    }

    pos.zobrist = computeHash(pos);
    return pos;
}

std::string posToFen(const Position& pos) {
    std::string result;
    result += (pos.sideToMove == 0) ? 'W' : 'B';
    result += ":W";

    bool first = true;
    for (int sq = 0; sq < 32; sq++) {
        Bitboard mask = (1U << sq);
        if (pos.whiteMen & mask) {
            if (!first) result += ',';
            result += std::to_string(sq + 1);
            first = false;
        } else if (pos.whiteKings & mask) {
            if (!first) result += ',';
            result += 'K';
            result += std::to_string(sq + 1);
            first = false;
        }
    }

    result += ":B";
    first = true;
    for (int sq = 0; sq < 32; sq++) {
        Bitboard mask = (1U << sq);
        if (pos.blackMen & mask) {
            if (!first) result += ',';
            result += std::to_string(sq + 1);
            first = false;
        } else if (pos.blackKings & mask) {
            if (!first) result += ',';
            result += 'K';
            result += std::to_string(sq + 1);
            first = false;
        }
    }

    return result;
}
