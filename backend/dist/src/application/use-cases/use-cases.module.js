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
const send_friend_request_use_case_1 = require("./send-friend-request.use-case");
const accept_friend_request_use_case_1 = require("./accept-friend-request.use-case");
const reject_friend_request_use_case_1 = require("./reject-friend-request.use-case");
const get_friends_use_case_1 = require("./get-friends.use-case");
const get_pending_friend_requests_use_case_1 = require("./get-pending-friend-requests.use-case");
const remove_friend_use_case_1 = require("./remove-friend.use-case");
const get_sent_friend_requests_use_case_1 = require("./get-sent-friend-requests.use-case");
const cancel_friend_request_use_case_1 = require("./cancel-friend-request.use-case");
const user_module_1 = require("../../domain/user/user.module");
const friend_module_1 = require("../../domain/friend/friend.module");
let UseCasesModule = class UseCasesModule {
};
exports.UseCasesModule = UseCasesModule;
exports.UseCasesModule = UseCasesModule = __decorate([
    (0, common_1.Module)({
        imports: [repository_module_1.RepositoryModule, messaging_module_1.MessagingModule, user_module_1.UserModule, friend_module_1.FriendModule],
        providers: [
            create_game_use_case_1.CreateGameUseCase,
            make_move_use_case_1.MakeMoveUseCase,
            get_game_state_use_case_1.GetGameStateUseCase,
            get_legal_moves_use_case_1.GetLegalMovesUseCase,
            end_game_use_case_1.EndGameUseCase,
            send_friend_request_use_case_1.SendFriendRequestUseCase,
            accept_friend_request_use_case_1.AcceptFriendRequestUseCase,
            reject_friend_request_use_case_1.RejectFriendRequestUseCase,
            get_friends_use_case_1.GetFriendsUseCase,
            get_pending_friend_requests_use_case_1.GetPendingFriendRequestsUseCase,
            remove_friend_use_case_1.RemoveFriendUseCase,
            get_sent_friend_requests_use_case_1.GetSentFriendRequestsUseCase,
            cancel_friend_request_use_case_1.CancelFriendRequestUseCase,
        ],
        exports: [
            create_game_use_case_1.CreateGameUseCase,
            make_move_use_case_1.MakeMoveUseCase,
            get_game_state_use_case_1.GetGameStateUseCase,
            get_legal_moves_use_case_1.GetLegalMovesUseCase,
            end_game_use_case_1.EndGameUseCase,
            send_friend_request_use_case_1.SendFriendRequestUseCase,
            accept_friend_request_use_case_1.AcceptFriendRequestUseCase,
            reject_friend_request_use_case_1.RejectFriendRequestUseCase,
            get_friends_use_case_1.GetFriendsUseCase,
            get_pending_friend_requests_use_case_1.GetPendingFriendRequestsUseCase,
            remove_friend_use_case_1.RemoveFriendUseCase,
            get_sent_friend_requests_use_case_1.GetSentFriendRequestsUseCase,
            cancel_friend_request_use_case_1.CancelFriendRequestUseCase,
        ],
    })
], UseCasesModule);
//# sourceMappingURL=use-cases.module.js.map