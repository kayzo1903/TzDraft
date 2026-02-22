"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineModule = void 0;
const common_1 = require("@nestjs/common");
const sidra_engine_service_1 = require("./sidra-engine.service");
const kallisto_engine_service_1 = require("./kallisto-engine.service");
const egtb_service_1 = require("./egtb.service");
let EngineModule = class EngineModule {
};
exports.EngineModule = EngineModule;
exports.EngineModule = EngineModule = __decorate([
    (0, common_1.Module)({
        providers: [sidra_engine_service_1.SidraEngineService, kallisto_engine_service_1.KallistoEngineService, egtb_service_1.EgtbService],
        exports: [sidra_engine_service_1.SidraEngineService, kallisto_engine_service_1.KallistoEngineService, egtb_service_1.EgtbService],
    })
], EngineModule);
//# sourceMappingURL=engine.module.js.map