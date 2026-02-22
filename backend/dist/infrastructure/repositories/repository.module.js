"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../database/prisma/prisma.module");
const prisma_game_repository_1 = require("./prisma-game.repository");
const prisma_move_repository_1 = require("./prisma-move.repository");
let RepositoryModule = class RepositoryModule {
};
exports.RepositoryModule = RepositoryModule;
exports.RepositoryModule = RepositoryModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [
            {
                provide: 'IGameRepository',
                useClass: prisma_game_repository_1.PrismaGameRepository,
            },
            {
                provide: 'IMoveRepository',
                useClass: prisma_move_repository_1.PrismaMoveRepository,
            },
        ],
        exports: ['IGameRepository', 'IMoveRepository'],
    })
], RepositoryModule);
//# sourceMappingURL=repository.module.js.map