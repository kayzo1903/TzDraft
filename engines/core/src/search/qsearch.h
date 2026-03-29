#ifndef SEARCH_QSEARCH_H
#define SEARCH_QSEARCH_H

#include "core/types.h"
#include "rules/variant.h"
#include "search/search.h"

// Quiescence search: only considers capture moves
int qsearch(Position& pos, int alpha, int beta, int ply, SearchInfo& info);

#endif // SEARCH_QSEARCH_H
