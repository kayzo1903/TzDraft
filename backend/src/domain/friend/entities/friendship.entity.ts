export class Friendship {
  id: string;
  initiatorId: string;
  recipientId: string;
  createdAt: Date;

  constructor(
    id: string,
    initiatorId: string,
    recipientId: string,
    createdAt: Date = new Date(),
  ) {
    this.id = id;
    this.initiatorId = initiatorId;
    this.recipientId = recipientId;
    this.createdAt = createdAt;
  }

  isFriendsWith(userId: string): boolean {
    return this.initiatorId === userId || this.recipientId === userId;
  }

  getFriendId(userId: string): string | null {
    if (this.initiatorId === userId) {
      return this.recipientId;
    } else if (this.recipientId === userId) {
      return this.initiatorId;
    }
    return null;
  }
}
