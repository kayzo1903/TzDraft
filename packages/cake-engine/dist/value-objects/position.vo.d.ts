/**
 * Position Value Object
 * Represents a square position on the Tanzania Drafti board (1-32)
 */
export declare class Position {
    private readonly _value;
    constructor(value: number);
    get value(): number;
    /**
     * Convert position to row and column (0-indexed)
     */
    toRowCol(): {
        row: number;
        col: number;
    };
    /**
     * Create Position from row and column (0-indexed)
     */
    static fromRowCol(row: number, col: number): Position;
    equals(other: Position): boolean;
    toString(): string;
}
//# sourceMappingURL=position.vo.d.ts.map