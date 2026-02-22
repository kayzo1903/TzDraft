export declare enum FriendRequestStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED"
}
export declare class FriendRequest {
    id: string;
    requesterId: string;
    requesteeId: string;
    status: FriendRequestStatus;
    createdAt: Date;
    respondedAt?: Date;
    constructor(id: string, requesterId: string, requesteeId: string, status?: FriendRequestStatus, createdAt?: Date, respondedAt?: Date);
    isPending(): boolean;
    isAccepted(): boolean;
    isRejected(): boolean;
}
