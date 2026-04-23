import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
import { ExpoPushService } from '../../infrastructure/push/expo-push.service';
import {
  Notification,
  NotificationType,
} from '../../domain/notification/notification.entity';
import type { INotificationRepository } from '../../domain/notification/repositories/notification.repository.interface';

@Injectable()
export class SocialNotificationService {
  private readonly logger = new Logger(SocialNotificationService.name);

  constructor(
    @Inject('INotificationRepository')
    private readonly notifRepo: INotificationRepository,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gateway: GamesGateway,
    private readonly prisma: PrismaService,
    private readonly expoPush: ExpoPushService,
  ) {}

  async notifyFollow(followerId: string, followingId: string): Promise<void> {
    const follower = await this.prisma.user.findUnique({
      where: { id: followerId },
    });
    if (!follower) return;

    const notif = await this.persist(followingId, NotificationType.SOCIAL_FOLLOW, {
      title: 'New Follower',
      body: `${follower.displayName} (@${follower.username}) started following you!`,
      meta: { followerId: follower.id, username: follower.username },
    });

    this.gateway.emitNotification(followingId, notif);
    void this.expoPush.sendToUser(followingId, notif.title, notif.body, {
      followerId: follower.id,
      screen: 'profile',
    });
  }

  async notifyFriendship(userAId: string, userBId: string): Promise<void> {
    const [userA, userB] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userAId } }),
      this.prisma.user.findUnique({ where: { id: userBId } }),
    ]);

    if (!userA || !userB) return;

    // Notify User A
    const notifA = await this.persist(userAId, NotificationType.FRIENDSHIP_ESTABLISHED, {
      title: 'New Friend!',
      body: `You and ${userB.displayName} are now friends. Challenge them to a game!`,
      meta: { friendId: userB.id, username: userB.username },
    });
    this.gateway.emitNotification(userAId, notifA);
    void this.expoPush.sendToUser(userAId, notifA.title, notifA.body, {
      friendId: userB.id,
      screen: 'profile',
    });

    // Notify User B
    const notifB = await this.persist(userBId, NotificationType.FRIENDSHIP_ESTABLISHED, {
      title: 'New Friend!',
      body: `You and ${userA.displayName} are now friends. Challenge them to a game!`,
      meta: { friendId: userA.id, username: userA.username },
    });
    this.gateway.emitNotification(userBId, notifB);
    void this.expoPush.sendToUser(userBId, notifB.title, notifB.body, {
      friendId: userA.id,
      screen: 'profile',
    });
  }

  private async persist(
    userId: string,
    type: NotificationType,
    opts: { title: string; body: string; meta?: Record<string, any> },
  ): Promise<Notification> {
    try {
      return await this.notifRepo.create(
        new Notification(
          randomUUID(),
          userId,
          type,
          opts.title,
          opts.body,
          opts.meta ?? null,
          false,
          new Date(),
        ),
      );
    } catch (err) {
      this.logger.error(
        `Failed to persist social notification for user ${userId}: ${err?.message}`,
      );
      return new Notification(
        randomUUID(),
        userId,
        type,
        opts.title,
        opts.body,
        opts.meta ?? null,
        false,
        new Date(),
      );
    }
  }
}
