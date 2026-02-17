export enum FriendRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export class FriendRequest {
  id: string;
  requesterId: string;
  requesteeId: string;
  status: FriendRequestStatus;
  createdAt: Date;
  respondedAt?: Date;

  constructor(
    id: string,
    requesterId: string,
    requesteeId: string,
    status: FriendRequestStatus = FriendRequestStatus.PENDING,
    createdAt: Date = new Date(),
    respondedAt?: Date,
  ) {
    this.id = id;
    this.requesterId = requesterId;
    this.requesteeId = requesteeId;
    this.status = status;
    this.createdAt = createdAt;
    this.respondedAt = respondedAt;
  }

  isPending(): boolean {
    return this.status === FriendRequestStatus.PENDING;
  }

  isAccepted(): boolean {
    return this.status === FriendRequestStatus.ACCEPTED;
  }

  isRejected(): boolean {
    return this.status === FriendRequestStatus.REJECTED;
  }
}
