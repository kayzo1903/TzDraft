import { SidraMoveRequest, SidraMoveResponse, SidraPayload } from './sidra-types';
export declare class SidraBoardMapper {
    static toSidraRequest(request: SidraMoveRequest): SidraPayload;
    static fromSidraResponse(parsed: SidraMoveResponse, originalRequest: SidraMoveRequest): SidraMoveResponse;
    private static findCapturePath;
    private static getLegalJumps;
    private static getManJumps;
    private static getKingJumps;
    private static getRowCol;
    private static positionFromRowCol;
    private static isPromotionSquare;
}
