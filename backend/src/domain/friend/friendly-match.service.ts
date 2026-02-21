import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { FriendService } from './friend.service';

const INVITE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FriendlyMatchStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const;
type FriendlyMatchStatus =
  (typeof FriendlyMatchStatus)[keyof typeof FriendlyMatchStatus];

@Injectable()
export class FriendlyMatchService {
  private readonly logger = new Logger(FriendlyMatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly friendService: FriendService,
  ) {}

  async createInvite(
    hostId: string,
    dto: {
      friendId?: string;
      initialTimeMs?: number;
      gameId?: string;
      roomType?: string;
      rated?: boolean;
      allowSpectators?: boolean;
    },
  ) {
    if (dto.friendId && dto.friendId === hostId) {
      throw new BadRequestException('Cannot invite yourself');
    }

    if (dto.friendId) {
      const areFriends = await this.friendService.areFriends(
        hostId,
        dto.friendId,
      );
      if (!areFriends) {
        throw new BadRequestException('You can only challenge your friends');
      }
    }

    const now = new Date();
    const initialTimeMs = this.normalizeInitialTime(dto.initialTimeMs);
    return this.prisma.friendlyMatch.create({
      data: {
        hostId,
        invitedFriendId: dto.friendId || null,
        inviteToken: randomBytes(16).toString('hex'),
        status: FriendlyMatchStatus.PENDING,
        gameId: dto.gameId || null,
        initialTimeMs,
        roomType: dto.roomType || 'single',
        hostColor: 'WHITE',
        rated: dto.rated || false,
        allowSpectators: dto.allowSpectators ?? true,
        expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
      },
      include: {
        host: {
          select: { id: true, username: true, displayName: true },
        },
        invitedFriend: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.friendlyMatch.findUnique({
      where: { inviteToken: token },
      include: {
        host: {
          select: { id: true, username: true, displayName: true },
        },
        invitedFriend: {
          select: { id: true, username: true, displayName: true },
        },
        guest: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    return this.expireIfNeeded(invite);
  }

  async getInviteById(id: string, actorId: string | null) {
    const invite = await this.prisma.friendlyMatch.findUnique({
      where: { id },
      include: {
        host: {
          select: { id: true, username: true, displayName: true },
        },
        invitedFriend: {
          select: { id: true, username: true, displayName: true },
        },
        guest: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Match invite not found');
    }

    // Invite IDs are non-guessable UUIDs — anyone who holds the ID
    // (host, accepted guest, or redirected viewer) may read it.
    // No per-user auth check needed here.
    return this.expireIfNeeded(invite);
  }

  async listIncoming(userId: string) {
    const invites = await this.prisma.friendlyMatch.findMany({
      where: {
        invitedFriendId: userId,
        status: FriendlyMatchStatus.PENDING,
      },
      include: {
        host: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return Promise.all(invites.map((invite) => this.expireIfNeeded(invite)));
  }

  async listOutgoing(hostId: string) {
    const invites = await this.prisma.friendlyMatch.findMany({
      where: {
        hostId,
        status: {
          in: [FriendlyMatchStatus.PENDING, FriendlyMatchStatus.ACCEPTED],
        },
      },
      include: {
        invitedFriend: {
          select: { id: true, username: true, displayName: true },
        },
        guest: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return Promise.all(invites.map((invite) => this.expireIfNeeded(invite)));
  }

  async cancelInvite(inviteId: string, hostId: string) {
    const invite = await this.getInviteById(inviteId, hostId);
    if (invite.hostId !== hostId) {
      throw new BadRequestException('Only host can cancel invite');
    }
    if (invite.status !== FriendlyMatchStatus.PENDING) {
      throw new BadRequestException('Only pending invites can be canceled');
    }
    await this.cleanupLinkedPendingGame(invite.gameId);
    return this.prisma.friendlyMatch.update({
      where: { id: inviteId },
      data: { status: FriendlyMatchStatus.CANCELED },
    });
  }

  async declineInvite(inviteId: string, userId: string) {
    const invite = await this.getInviteById(inviteId, userId);
    if (invite.invitedFriendId && invite.invitedFriendId !== userId) {
      throw new BadRequestException('Only invited friend can decline');
    }
    if (invite.status !== FriendlyMatchStatus.PENDING) {
      throw new BadRequestException('Only pending invites can be declined');
    }
    await this.cleanupLinkedPendingGame(invite.gameId);
    return (this.prisma as any).friendlyMatch.update({
      where: { id: inviteId },
      data: { status: FriendlyMatchStatus.DECLINED },
    });
  }

  async reserveInviteForAccept(token: string, guestId: string) {
    const invite = await this.getInviteByToken(token);
    if (invite.hostId === guestId) {
      throw new BadRequestException('Host cannot accept own invite');
    }
    if (invite.status !== FriendlyMatchStatus.PENDING) {
      throw new BadRequestException('Invite is no longer pending');
    }

    if (invite.invitedFriendId && invite.invitedFriendId !== guestId) {
      throw new BadRequestException('Invite is for a different friend');
    }

    // Direct friend challenges remain friend-only.
    // Open link invites (no invitedFriendId) are intentionally open to anyone with the link.
    if (invite.invitedFriendId) {
      const areFriends = await this.friendService.areFriends(
        invite.hostId,
        guestId,
      );
      if (!areFriends) {
        throw new BadRequestException(
          'Only friends can accept this direct challenge',
        );
      }
    }

    const updated = await this.prisma.friendlyMatch.updateMany({
      where: {
        id: invite.id,
        status: FriendlyMatchStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      data: {
        status: FriendlyMatchStatus.ACCEPTED,
        guestId,
        acceptedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      throw new BadRequestException('Invite already accepted or expired');
    }

    return this.prisma.friendlyMatch.findUniqueOrThrow({
      where: { id: invite.id },
      include: {
        host: {
          select: { id: true, username: true, displayName: true },
        },
        guest: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });
  }

  async attachGame(inviteId: string, gameId: string) {
    return this.prisma.friendlyMatch.update({
      where: { id: inviteId },
      data: { gameId },
    });
  }

  async rollbackAcceptance(inviteId: string) {
    await this.prisma.friendlyMatch.update({
      where: { id: inviteId },
      data: {
        status: FriendlyMatchStatus.PENDING,
        guestId: null,
        acceptedAt: null,
      },
    });
  }

  private normalizeInitialTime(initialTimeMs?: number): number {
    if (!Number.isFinite(initialTimeMs)) return 600000;
    return Math.min(
      60 * 60 * 1000,
      Math.max(60 * 1000, Math.floor(initialTimeMs!)),
    );
  }

  private async expireIfNeeded<
    T extends { id: string; status: FriendlyMatchStatus; expiresAt: Date },
  >(invite: T): Promise<T> {
    if (invite.status !== FriendlyMatchStatus.PENDING) return invite;
    if (invite.expiresAt.getTime() > Date.now()) return invite;

    await this.prisma.friendlyMatch.update({
      where: { id: invite.id },
      data: { status: FriendlyMatchStatus.EXPIRED },
    });
    return { ...invite, status: FriendlyMatchStatus.EXPIRED };
  }

  private async cleanupLinkedPendingGame(gameId?: string | null) {
    if (!gameId) return;
    await this.prisma.game.deleteMany({
      where: { id: gameId },
    });
  }
}
