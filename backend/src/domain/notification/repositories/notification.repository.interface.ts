import { Notification } from '../notification.entity';

export interface INotificationRepository {
  create(notification: Notification): Promise<Notification>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
  countUnread(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}
