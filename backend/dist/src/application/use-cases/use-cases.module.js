"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UseCasesModule = void 0;
const common_1 = require("@nestjs/common");
const repository_module_1 = require("../../infrastructure/repositories/repository.module");
const messaging_module_1 = require("../../infrastructure/messaging/messaging.module");
const create_game_use_case_1 = require("./create-game.use-case");
const make_move_use_case_1 = require("./make-move.use-case");
const get_game_state_use_case_1 = require("./get-game-state.use-case");
const get_legal_moves_use_case_1 = require("./get-legal-moves.use-case");
const end_game_use_case_1 = require("./end-game.use-case");
let UseCasesModule = class UseCasesModule {
};
exports.UseCasesModule = UseCasesModule;
exports.UseCasesModule = UseCasesModule = __decorate([
    (0, common_1.Module)({
        imports: [repository_module_1.RepositoryModule, messaging_module_1.MessagingModule],
        providers: [
            create_game_use_case_1.CreateGameUseCase,
            make_move_use_case_1.MakeMoveUseCase,
            get_game_state_use_case_1.GetGameStateUseCase,
            get_legal_moves_use_case_1.GetLegalMovesUseCase,
            end_game_use_case_1.EndGameUseCase,
        ],
        exports: [
            create_game_use_case_1.CreateGameUseCase,
            make_move_use_case_1.MakeMoveUseCase,
            get_game_state_use_case_1.GetGameStateUseCase,
            get_legal_moves_use_case_1.GetLegalMovesUseCase,
            end_game_use_case_1.EndGameUseCase,
        ],
    })
], UseCasesModule);
//# sourceMappingURL=use-cases.module.js.map