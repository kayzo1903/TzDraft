#ifndef RULES_REPETITION_H
#define RULES_REPETITION_H

#include "core/types.h"
#include <cstdint>

void pushHash(uint64_t h);
void popHash();
bool isRepetitionHash(uint64_t hash, int threshold);

#endif // RULES_REPETITION_H
