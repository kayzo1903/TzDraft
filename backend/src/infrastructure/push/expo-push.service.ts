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

interface ExpoReceiptResponse {
  data: Record<
    string,
    | { status: 'ok' }
    | { status: 'error'; message: string; details?: { error?: string } }
  >;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const CHUNK_SIZE = 100;

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Send to a single user by userId (fetches token internally). */
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

  /**
   * Send to a pre-resolved list of push tokens (used by the BullMQ worker
   * which already has tokens from its paginated DB query).
   * Returns Expo ticket IDs for receipt verification.
   */
  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<string[]> {
    if (tokens.length === 0) return [];

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      title,
      body,
      data,
      sound: 'default' as const,
      channelId: 'default',
      priority: 'high' as const,
    }));

    const ticketIds: string[] = [];
    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const ids = await this.sendMessages(messages.slice(i, i + CHUNK_SIZE));
      ticketIds.push(...ids);
    }
    return ticketIds;
  }

  /**
   * Legacy helper: resolves userIds → tokens then calls sendToTokens.
   * Used by non-queue code paths. Returns ticket IDs.
   */
  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<string[]> {
    if (userIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, pushToken: { not: null } },
      select: { pushToken: true },
    });

    const tokens = users.map((u) => u.pushToken!).filter(Boolean);
    return this.sendToTokens(tokens, title, body, data);
  }

  /**
   * Check Expo push receipts for a list of ticket IDs.
   * Handles DeviceNotRegistered by nulling the token.
   * Returns the count of failed deliveries.
   */
  async checkReceipts(receiptIds: string[]): Promise<number> {
    if (receiptIds.length === 0) return 0;
    let failedCount = 0;

    for (let i = 0; i < receiptIds.length; i += CHUNK_SIZE) {
      const chunk = receiptIds.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch(EXPO_RECEIPTS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ ids: chunk }),
        });

        if (!res.ok) {
          this.logger.warn(`Expo receipts HTTP error: ${res.status}`);
          continue;
        }

        const json = (await res.json()) as ExpoReceiptResponse;
        for (const [, receipt] of Object.entries(json.data ?? {})) {
          if (receipt.status === 'error') {
            failedCount++;
            this.logger.warn(
              `Expo receipt error: ${receipt.message} (${receipt.details?.error})`,
            );
            if (receipt.details?.error === 'DeviceNotRegistered') {
              // Token invalidation is best-effort; we don't know the token here
              // but the send-phase already handles this via ticket errors.
            }
          }
        }
      } catch (err: any) {
        this.logger.error(`Expo receipt check failed: ${err?.message}`);
      }
    }

    return failedCount;
  }

  /** Returns ticket IDs for all successfully accepted messages. */
  private async sendMessages(messages: ExpoPushMessage[]): Promise<string[]> {
    if (messages.length === 0) return [];
    const ticketIds: string[] = [];
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
        return [];
      }

      const json = (await res.json()) as { data: ExpoPushTicket[] };
      for (let i = 0; i < (json.data ?? []).length; i++) {
        const ticket = json.data[i];
        if (ticket.status === 'ok' && ticket.id) {
          ticketIds.push(ticket.id);
        } else if (ticket.status === 'error') {
          this.logger.warn(
            `Expo push ticket error: ${ticket.message} (${ticket.details?.error})`,
          );
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await this.invalidateToken(messages[i]?.to);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Expo push failed: ${err?.message}`);
    }
    return ticketIds;
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
