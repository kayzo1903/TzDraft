"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Friendship = void 0;
class Friendship {
    id;
    initiatorId;
    recipientId;
    createdAt;
    constructor(id, initiatorId, recipientId, createdAt = new Date()) {
        this.id = id;
        this.initiatorId = initiatorId;
        this.recipientId = recipientId;
        this.createdAt = createdAt;
    }
    isFriendsWith(userId) {
        return this.initiatorId === userId || this.recipientId === userId;
    }
    getFriendId(userId) {
        if (this.initiatorId === userId) {
            return this.recipientId;
        }
        else if (this.recipientId === userId) {
            return this.initiatorId;
        }
        return null;
    }
}
exports.Friendship = Friendship;
//# sourceMappingURL=friendship.entity.js.map