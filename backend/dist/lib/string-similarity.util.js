"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.levenshteinDistance = levenshteinDistance;
exports.stringSimilarity = stringSimilarity;
exports.matchScore = matchScore;
exports.fuzzySearch = fuzzySearch;
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];
    for (let i = 0; i <= len2; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
            const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    return matrix[len2][len1];
}
function stringSimilarity(str1, str2) {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0)
        return 100;
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return Math.round(((maxLen - distance) / maxLen) * 100);
}
function matchScore(searchTerm, fields) {
    if (!searchTerm.trim())
        return 0;
    const term = searchTerm.toLowerCase();
    let totalScore = 0;
    let totalWeight = 0;
    for (const field of fields) {
        const value = field.value.toLowerCase();
        if (value === term) {
            return 100;
        }
        if (value.startsWith(term)) {
            totalScore += 90 * field.weight;
        }
        else if (value.includes(term)) {
            totalScore += 75 * field.weight;
        }
        else {
            const similarity = stringSimilarity(term, value);
            totalScore += similarity * field.weight;
        }
        totalWeight += field.weight;
    }
    return Math.round(totalScore / totalWeight);
}
function fuzzySearch(searchTerm, items, getFields, minScore = 60) {
    return items
        .map((item) => {
        const score = matchScore(searchTerm, getFields(item));
        return { item, score };
    })
        .filter((result) => result.score >= minScore)
        .sort((a, b) => b.score - a.score);
}
//# sourceMappingURL=string-similarity.util.js.map