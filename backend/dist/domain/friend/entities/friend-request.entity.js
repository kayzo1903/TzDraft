"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendRequest = exports.FriendRequestStatus = void 0;
var FriendRequestStatus;
(function (FriendRequestStatus) {
    FriendRequestStatus["PENDING"] = "PENDING";
    FriendRequestStatus["ACCEPTED"] = "ACCEPTED";
    FriendRequestStatus["REJECTED"] = "REJECTED";
})(FriendRequestStatus || (exports.FriendRequestStatus = FriendRequestStatus = {}));
class FriendRequest {
    id;
    requesterId;
    requesteeId;
    status;
    createdAt;
    respondedAt;
    constructor(id, requesterId, requesteeId, status = FriendRequestStatus.PENDING, createdAt = new Date(), respondedAt) {
        this.id = id;
        this.requesterId = requesterId;
        this.requesteeId = requesteeId;
        this.status = status;
        this.createdAt = createdAt;
        this.respondedAt = respondedAt;
    }
    isPending() {
        return this.status === FriendRequestStatus.PENDING;
    }
    isAccepted() {
        return this.status === FriendRequestStatus.ACCEPTED;
    }
    isRejected() {
        return this.status === FriendRequestStatus.REJECTED;
    }
}
exports.FriendRequest = FriendRequest;
//# sourceMappingURL=friend-request.entity.js.map