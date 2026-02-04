export declare class Position {
    private readonly _value;
    constructor(value: number);
    get value(): number;
    toRowCol(): {
        row: number;
        col: number;
    };
    static fromRowCol(row: number, col: number): Position;
    equals(other: Position): boolean;
    toString(): string;
}
