export declare class Friendship {
    id: string;
    initiatorId: string;
    recipientId: string;
    createdAt: Date;
    constructor(id: string, initiatorId: string, recipientId: string, createdAt?: Date);
    isFriendsWith(userId: string): boolean;
    getFriendId(userId: string): string | null;
}
