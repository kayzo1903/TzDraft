export type SidraPayload = {
    pieces: {
        type: 'MAN' | 'KING';
        color: 'WHITE' | 'BLACK';
        position: number;
    }[];
    currentPlayer: 'WHITE' | 'BLACK';
    moveCount: number;
    timeLimitMs?: number;
};
export type SidraMoveRequest = {
    pieces: {
        type: 'MAN' | 'KING';
        color: 'WHITE' | 'BLACK';
        position: number;
    }[];
    currentPlayer: 'WHITE' | 'BLACK';
    moveCount: number;
    timeLimitMs?: number;
};
export type SidraMoveResponse = {
    from: number;
    to: number;
    capturedSquares: number[];
    isPromotion: boolean;
};
