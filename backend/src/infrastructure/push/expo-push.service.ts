import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });
    if (!user?.pushToken) return;

    await this.sendMessages([
      {
        to: user.pushToken,
        title,
        body,
        data,
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      },
    ]);
  }

  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    if (userIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, pushToken: { not: null } },
      select: { pushToken: true },
    });

    const messages: ExpoPushMessage[] = users
      .filter((u) => u.pushToken)
      .map((u) => ({
        to: u.pushToken!,
        title,
        body,
        data,
        sound: 'default' as const,
        channelId: 'default',
        priority: 'high' as const,
      }));

    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      await this.sendMessages(messages.slice(i, i + CHUNK_SIZE));
    }
  }

  private async sendMessages(messages: ExpoPushMessage[]): Promise<void> {
    if (messages.length === 0) return;
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        this.logger.warn(`Expo push HTTP error: ${res.status}`);
        return;
      }

      const json = (await res.json()) as { data: ExpoPushTicket[] };
      for (const ticket of json.data ?? []) {
        if (ticket.status === 'error') {
          this.logger.warn(
            `Expo push ticket error: ${ticket.message} (${ticket.details?.error})`,
          );
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await this.invalidateToken(messages[json.data.indexOf(ticket)]?.to);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Expo push failed: ${err?.message}`);
    }
  }

  private async invalidateToken(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      await this.prisma.user.updateMany({
        where: { pushToken: token },
        data: { pushToken: null },
      });
    } catch {
      // best-effort
    }
  }
}
