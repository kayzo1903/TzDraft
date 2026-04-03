import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import {
  Notification,
  NotificationType,
} from '../../domain/notification/notification.entity';
import type { INotificationRepository } from '../../domain/notification/repositories/notification.repository.interface';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(notification: Notification): Promise<Notification> {
    const row = await this.prisma.notification.create({
      data: {
        id: notification.id,
        userId: notification.userId,
        type: notification.type as any,
        title: notification.title,
        body: notification.body,
        metadata: notification.metadata ?? undefined,
        read: notification.read,
        createdAt: notification.createdAt,
      },
    });
    return this.toDomain(row);
  }

  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  private toDomain(row: any): Notification {
    return new Notification(
      row.id,
      row.userId,
      row.type as NotificationType,
      row.title,
      row.body,
      row.metadata as Record<string, any> | null,
      row.read,
      row.createdAt,
    );
  }
}
