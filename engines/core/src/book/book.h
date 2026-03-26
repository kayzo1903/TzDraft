#ifndef BOOK_BOOK_H
#define BOOK_BOOK_H

#include "core/types.h"
#include <optional>

// Opening book stub. Returns nullopt (no book moves available).
std::optional<Move> lookupBook(const Position& pos);

#endif // BOOK_BOOK_H
