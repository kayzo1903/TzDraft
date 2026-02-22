import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CreateGameUseCase } from '../../../application/use-cases/create-game.use-case';
import { GameType } from '../../../shared/constants/game.constants';
import { FriendlyMatchService } from '../../../domain/friend/friendly-match.service';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import type { IGameRepository } from '../../../domain/game/repositories/game.repository.interface';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { randomInt } from 'crypto';
import { verify } from 'jsonwebtoken';

@ApiTags('friendly-matches')
@ApiBearerAuth()
@Controller('friends/matches')
@UseGuards(JwtAuthGuard)
export class FriendlyMatchController {
  private readonly inviteViewers = new Map<string, Set<string>>();

  constructor(
    private readonly friendlyMatchService: FriendlyMatchService,
    private readonly createGameUseCase: CreateGameUseCase,
    private readonly gamesGateway: GamesGateway,
    private readonly prisma: PrismaService,
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a friendly (unranked) invite' })
  @ApiResponse({ status: 201, description: 'Invite created' })
  async createInvite(
    @CurrentUser() user: any,
    @Body()
    dto: {
      friendId?: string;
      initialTimeMs?: number;
      locale?: 'en' | 'sw';
      roomType?: string;
      rated?: boolean;
      allowSpectators?: boolean;
    },
  ) {
    const payload = dto || {};
    let gameId: string | undefined;

    if (payload.friendId) {
      const friendBusy = await this.hasBlockingActiveGame(payload.friendId);
      if (friendBusy) {
        throw new BadRequestException('Friend is in another match right now');
      }

      const hostBusy = await this.hasBlockingActiveGame(user.id);
      if (hostBusy) {
        throw new BadRequestException('You are already in another match');
      }

      const preGame = await this.createGameUseCase.createFriendlyGame(
        user.id,
        payload.friendId,
        500,
        500,
        undefined,
        undefined,
        GameType.CASUAL,
        payload.initialTimeMs,
      );
      gameId = preGame.id;
    }

    let invite: any;
    try {
      invite = await this.friendlyMatchService.createInvite(user.id, {
        ...payload,
        gameId,
      });
    } catch (error) {
      if (gameId) {
        await this.gameRepository.delete(gameId);
      }
      throw error;
    }
    const locale =
      payload.locale === 'en' ? 'en' : payload.locale === 'sw' ? 'sw' : 'en';
    const frontendBase = (
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const inviteUrl = `${frontendBase}/${locale}/game/friendly/${invite.inviteToken}`;
    const waitingUrl = `${frontendBase}/${locale}/game/friendly/wait/${invite.id}`;

    if (invite.invitedFriendId) {
      const isOnline = await this.gamesGateway.isParticipantOnline(
        invite.invitedFriendId,
      );
      if (isOnline) {
        await this.gamesGateway.emitToParticipant(
          invite.invitedFriendId,
          'friendlyMatchInvited',
          {
            inviteId: invite.id,
            inviteToken: invite.inviteToken,
            hostId: invite.hostId,
            hostDisplayName: invite.host.displayName,
            inviteUrl,
            expiresAt: invite.expiresAt,
          },
        );
      }
    }

    return {
      ...invite,
      gameId: invite.gameId || gameId || null,
      inviteUrl,
      waitingUrl,
      whatsappShareText:
        locale === 'sw'
          ? `🎯 Nakuchallenge mchezo wa Tanzania Draughts! Bonyeza hapa ucheze: ${inviteUrl}`
          : `🎯 I challenge you to a game of Tanzania Draughts! Click here to play: ${inviteUrl}`,
    };
  }

  @Get('invites/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get invite details by token' })
  @ApiResponse({ status: 200, description: 'Invite details' })
  async getInvite(
    @CurrentUser() user: any,
    @Param('token') token: string,
    @Query('guestId') guestId?: string,
    @Req() req?: any,
  ) {
    const invite = await this.friendlyMatchService.getInviteByToken(token);
    const actorId = user?.id || this.normalizeGuestId(guestId) || null;
    const canAccept =
      invite.status === 'PENDING' &&
      invite.hostId !== actorId &&
      (!invite.invitedFriendId || invite.invitedFriendId === actorId);

    if (invite.status === 'PENDING' && invite.hostId !== actorId) {
      const viewerKey = actorId || req?.ip || `anon-${Date.now()}`;
      let viewers = this.inviteViewers.get(invite.id);
      if (!viewers) {
        viewers = new Set<string>();
        this.inviteViewers.set(invite.id, viewers);
      }
      viewers.add(String(viewerKey));
      await this.gamesGateway.emitToParticipant(
        invite.hostId,
        'friendlyInviteLinkViewed',
        {
          inviteId: invite.id,
          totalViews: viewers.size,
        },
      );
    }

    return { ...invite, canAccept };
  }

  @Get('incoming')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List incoming direct friend challenges' })
  async incoming(@CurrentUser() user: any) {
    return this.friendlyMatchService.listIncoming(user.id);
  }

  @Get('outgoing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List outgoing friendly invites/challenges' })
  async outgoing(@CurrentUser() user: any) {
    return this.friendlyMatchService.listOutgoing(user.id);
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a specific invite by id (host, guest, or invited friend)',
  })
  async getById(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('guestId') guestId?: string,
  ) {
    // Resolve actor: may be a JWT-authenticated user or a guest with a token
    const actorId = user?.id || this.resolveGuestId(guestId) || null;
    try {
      return await this.friendlyMatchService.getInviteById(id, actorId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to retrieve invite',
      );
    }
  }

  @Post('invites/:token/accept')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept invite and start unranked friendly game' })
  async accept(
    @CurrentUser() user: any,
    @Param('token') token: string,
    @Req() req: any,
    @Body() body?: { guestId?: string; guestName?: string },
  ) {
    const actorId = this.resolveActorId(user, req, body?.guestId);
    if (!actorId) {
      throw new BadRequestException('Missing player identity');
    }
    if (!user?.id) {
      await this.ensureGuestParticipant(actorId, body?.guestName);
    }

    const invite = await this.friendlyMatchService.reserveInviteForAccept(
      token,
      actorId,
    );

    try {
      let gameId = invite.gameId as string | null;
      if (!gameId) {
        const game = await this.createGameUseCase.createFriendlyGame(
          invite.hostId,
          actorId,
          500,
          500,
          undefined,
          undefined,
          GameType.CASUAL,
          invite.initialTimeMs,
        );
        gameId = game.id;
        await this.friendlyMatchService.attachGame(invite.id, gameId);
      }

      await this.gamesGateway.emitToParticipant(
        invite.hostId,
        'friendlyInviteOpponentJoined',
        {
          inviteId: invite.id,
          gameId,
          guestId: actorId,
          guestDisplayName:
            invite.guest?.displayName || body?.guestName || 'Opponent',
        },
      );

      // Host is already notified via friendlyInviteOpponentJoined (emitted above).
      // Both players navigate via their own 3s countdown, then send joinGame from
      // the game page, at which point the gateway activates the WAITING game.

      const persistedGame = await this.gameRepository.findById(gameId);
      const playerColor =
        persistedGame?.whitePlayerId === actorId
          ? 'WHITE'
          : persistedGame?.blackPlayerId === actorId
            ? 'BLACK'
            : null;

      return { status: 'success', gameId, inviteId: invite.id, playerColor };
    } catch (error) {
      await this.friendlyMatchService.rollbackAcceptance(invite.id);
      throw error;
    }
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline a direct friend challenge' })
  async decline(@CurrentUser() user: any, @Param('id') id: string) {
    const invite = await this.friendlyMatchService.declineInvite(id, user.id);
    if (invite?.hostId) {
      await this.gamesGateway.emitToParticipant(
        invite.hostId,
        'friendlyInviteDeclined',
        {
          inviteId: invite.id,
          declinedBy: user.id,
        },
      );
    }
    return { status: 'success' };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel your pending invite' })
  async cancel(@CurrentUser() user: any, @Param('id') id: string) {
    await this.friendlyMatchService.cancelInvite(id, user.id);
    return { status: 'success' };
  }

  private normalizeGuestId(input?: string): string | null {
    if (!input) return null;
    const cleaned = String(input).trim();
    if (!/^\d{9}$/.test(cleaned)) return null;
    return cleaned;
  }

  private resolveGuestId(input?: string): string {
    const normalized = this.normalizeGuestId(input);
    if (normalized) return normalized;
    return randomInt(0, 1_000_000_000).toString().padStart(9, '0');
  }

  private resolveActorId(
    user: any,
    req: any,
    guestId?: string,
  ): string | null {
    if (user?.id) return user.id;

    const authHeader =
      req?.headers?.authorization || req?.headers?.Authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const secret = process.env.JWT_SECRET;
      if (token && secret) {
        try {
          const payload = verify(token, secret) as { sub?: unknown };
          if (typeof payload?.sub === 'string' && payload.sub.length > 0) {
            return payload.sub;
          }
        } catch {
          // Fall through to guest-id resolution when bearer token is invalid.
        }
      }
    }

    return this.normalizeGuestId(guestId);
  }

  private async ensureGuestParticipant(guestId: string, guestName?: string) {
    const id = this.resolveGuestId(guestId);
    const token = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    // Bug 6 fix: always suffix with token to prevent unique displayName collisions
    const baseName = guestName?.trim() || 'Guest';
    const displayName = `${baseName}-${token.slice(0, 6)}`;
    await this.prisma.user.upsert({
      where: { id },
      update: { displayName },
      create: {
        id,
        phoneNumber: `guest-${token}`,
        username: `guest_${token}`,
        displayName,
        passwordHash: null,
      },
    });
  }

  private async hasBlockingActiveGame(playerId: string): Promise<boolean> {
    const activeGames =
      await this.gameRepository.findActiveGamesByPlayer(playerId);
    if (activeGames.length === 0) return false;

    const activeIds = activeGames.map((g) => g.id);
    const pendingInvites = await (this.prisma as any).friendlyMatch.findMany({
      where: {
        gameId: { in: activeIds },
        status: 'PENDING',
      },
      select: { gameId: true },
    });

    const pendingIds = new Set(
      pendingInvites
        .map((invite: { gameId?: string | null }) => invite.gameId)
        .filter((id: string | null | undefined): id is string => Boolean(id)),
    );

    return activeGames.some((game) => !pendingIds.has(game.id));
  }
}
