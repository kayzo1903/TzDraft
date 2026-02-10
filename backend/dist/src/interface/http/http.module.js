"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpModule = void 0;
const common_1 = require("@nestjs/common");
const use_cases_module_1 = require("../../application/use-cases/use-cases.module");
const game_controller_1 = require("./controllers/game.controller");
const move_controller_1 = require("./controllers/move.controller");
const support_controller_1 = require("./controllers/support.controller");
const email_module_1 = require("../../infrastructure/email/email.module");
let HttpModule = class HttpModule {
};
exports.HttpModule = HttpModule;
exports.HttpModule = HttpModule = __decorate([
    (0, common_1.Module)({
        imports: [use_cases_module_1.UseCasesModule, email_module_1.EmailModule],
        controllers: [game_controller_1.GameController, move_controller_1.MoveController, support_controller_1.SupportController],
    })
], HttpModule);
//# sourceMappingURL=http.module.js.map