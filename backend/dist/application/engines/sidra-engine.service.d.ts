import { SidraMoveRequest, SidraMoveResponse } from './sidra-types';
export declare class SidraEngineService {
    getMove(request: SidraMoveRequest): Promise<SidraMoveResponse | null>;
    private normalizeToOfficialMove;
    private fallbackOfficialMove;
    private executeSidraCli;
}
