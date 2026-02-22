import { SidraMoveRequest, SidraMoveResponse } from './sidra-types';
export declare class KallistoEngineService {
    private readonly LOG_FILE;
    static timeLimitForLevel(level: number): number;
    getMove(request: SidraMoveRequest): Promise<SidraMoveResponse | null>;
    private normalizeToOfficialMove;
    private fallbackOfficialMove;
    private buildBoard;
    private executeSidecar;
    private appendDebugLog;
}
