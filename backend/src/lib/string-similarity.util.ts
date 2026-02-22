/**
 * Calculate Levenshtein distance (edit distance) between two strings
 * Lower score = more similar
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize first column and row
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1, // deletion
        matrix[i - 1][j] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return matrix[len2][len1];
}

/**
 * Calculate similarity percentage between two strings (0-100)
 * Uses Levenshtein distance
 * 100 = exact match, 0 = completely different
 */
export function stringSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100; // both empty

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

/**
 * Match a search term against multiple fields with weighted scoring
 * Returns similarity score (0-100)
 */
export function matchScore(
  searchTerm: string,
  fields: { value: string; weight: number }[],
): number {
  if (!searchTerm.trim()) return 0;

  const term = searchTerm.toLowerCase();
  let totalScore = 0;
  let totalWeight = 0;

  for (const field of fields) {
    const value = field.value.toLowerCase();

    // Exact match gets 100
    if (value === term) {
      return 100;
    }

    // Starts with search term gets bonus
    if (value.startsWith(term)) {
      totalScore += 90 * field.weight;
    }
    // Contains search term gets good score
    else if (value.includes(term)) {
      totalScore += 75 * field.weight;
    }
    // Fuzzy match based on similarity
    else {
      const similarity = stringSimilarity(term, value);
      totalScore += similarity * field.weight;
    }

    totalWeight += field.weight;
  }

  return Math.round(totalScore / totalWeight);
}

/**
 * Search and rank results by similarity
 */
export function fuzzySearch<T>(
  searchTerm: string,
  items: T[],
  getFields: (item: T) => { value: string; weight: number }[],
  minScore = 60,
): { item: T; score: number }[] {
  return items
    .map((item) => {
      const score = matchScore(searchTerm, getFields(item));
      return { item, score };
    })
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
