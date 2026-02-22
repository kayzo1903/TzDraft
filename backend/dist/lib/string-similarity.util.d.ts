export declare function levenshteinDistance(str1: string, str2: string): number;
export declare function stringSimilarity(str1: string, str2: string): number;
export declare function matchScore(searchTerm: string, fields: {
    value: string;
    weight: number;
}[]): number;
export declare function fuzzySearch<T>(searchTerm: string, items: T[], getFields: (item: T) => {
    value: string;
    weight: number;
}[], minScore?: number): {
    item: T;
    score: number;
}[];
