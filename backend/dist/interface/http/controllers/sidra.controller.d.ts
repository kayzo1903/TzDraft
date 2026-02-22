import { SidraEngineService } from '../../../application/engines/sidra-engine.service';
import type { SidraMoveRequest } from '../../../application/engines/sidra-types';
export declare class SidraController {
    private readonly sidraEngine;
    constructor(sidraEngine: SidraEngineService);
    getMove(body: SidraMoveRequest): Promise<{
        move: import("../../../application/engines/sidra-types").SidraMoveResponse | null;
    }>;
}
