"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const games_gateway_1 = require("./games.gateway");
const matchmaking_service_1 = require("../../application/services/matchmaking.service");
const use_cases_module_1 = require("../../application/use-cases/use-cases.module");
const repository_module_1 = require("../repositories/repository.module");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET') || 'default-secret-key',
                    signOptions: {
                        expiresIn: '15m',
                    },
                }),
            }),
            (0, common_1.forwardRef)(() => use_cases_module_1.UseCasesModule),
            repository_module_1.RepositoryModule,
        ],
        providers: [games_gateway_1.GamesGateway, matchmaking_service_1.MatchmakingService],
        exports: [games_gateway_1.GamesGateway],
    })
], MessagingModule);
//# sourceMappingURL=messaging.module.js.map