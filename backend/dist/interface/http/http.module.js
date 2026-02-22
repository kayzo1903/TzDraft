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
const engine_module_1 = require("../../application/engines/engine.module");
const sidra_controller_1 = require("./controllers/sidra.controller");
const friend_controller_1 = require("./controllers/friend.controller");
const system_controller_1 = require("./controllers/system.controller");
const friendly_match_controller_1 = require("./controllers/friendly-match.controller");
const friend_module_1 = require("../../domain/friend/friend.module");
const messaging_module_1 = require("../../infrastructure/messaging/messaging.module");
const repository_module_1 = require("../../infrastructure/repositories/repository.module");
let HttpModule = class HttpModule {
};
exports.HttpModule = HttpModule;
exports.HttpModule = HttpModule = __decorate([
    (0, common_1.Module)({
        imports: [
            use_cases_module_1.UseCasesModule,
            email_module_1.EmailModule,
            engine_module_1.EngineModule,
            friend_module_1.FriendModule,
            messaging_module_1.MessagingModule,
            repository_module_1.RepositoryModule,
        ],
        controllers: [
            game_controller_1.GameController,
            move_controller_1.MoveController,
            support_controller_1.SupportController,
            sidra_controller_1.SidraController,
            friend_controller_1.FriendController,
            friendly_match_controller_1.FriendlyMatchController,
            system_controller_1.SystemController,
        ],
    })
], HttpModule);
//# sourceMappingURL=http.module.js.map