"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GetAiMoveUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAiMoveUseCase = void 0;
const common_1 = require("@nestjs/common");
const kallisto_adapter_1 = require("../../infrastructure/engine/kallisto.adapter");
const sidra_adapter_1 = require("../../infrastructure/engine/sidra.adapter");
let GetAiMoveUseCase = GetAiMoveUseCase_1 = class GetAiMoveUseCase {
    sidraAdapter;
    kallistoAdapter;
    logger = new common_1.Logger(GetAiMoveUseCase_1.name);
    constructor(sidraAdapter, kallistoAdapter) {
        this.sidraAdapter = sidraAdapter;
        this.kallistoAdapter = kallistoAdapter;
    }
    async execute(dto) {
        const { boardStatePieces, currentPlayer, aiLevel, timeLimitMs, mustContinueFrom, } = dto;
        if (!Array.isArray(boardStatePieces)) {
            throw new common_1.BadRequestException('Invalid board state format');
        }
        if (aiLevel < 10) {
            this.logger.warn(`Level ${aiLevel} (local CAKE) was unexpectedly routed to the backend. Returning null.`);
            return null;
        }
        const engineColor = currentPlayer;
        const enginePieces = boardStatePieces.map((p) => ({
            type: p.type,
            color: p.color,
            position: p.position,
        }));
        const request = {
            currentPlayer: engineColor,
            pieces: enginePieces,
            timeLimitMs,
            aiLevel,
            mustContinueFrom: mustContinueFrom ?? null,
        };
        if (aiLevel < 16) {
            this.logger.debug(`Routing to SiDra Engine (Level ${aiLevel})`);
            try {
                const move = await this.sidraAdapter.getBestMove(request);
                return move ?? null;
            }
            catch (err) {
                this.logger.warn(`SiDra adapter failed (level ${aiLevel}): ${err.message}. Returning null.`);
                return null;
            }
        }
        this.logger.debug(`Routing to Kallisto Engine (Level ${aiLevel})`);
        try {
            const move = await this.kallistoAdapter.getBestMove(request);
            return move ?? null;
        }
        catch (err) {
            this.logger.warn(`Kallisto adapter failed (level ${aiLevel}): ${err.message}. Returning null.`);
            return null;
        }
    }
};
exports.GetAiMoveUseCase = GetAiMoveUseCase;
exports.GetAiMoveUseCase = GetAiMoveUseCase = GetAiMoveUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sidra_adapter_1.SidraAdapter,
        kallisto_adapter_1.KallistoAdapter])
], GetAiMoveUseCase);
//# sourceMappingURL=get-ai-move.use-case.js.map