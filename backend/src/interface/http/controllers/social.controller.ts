import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { SocialService } from '../../../domain/social/social.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import { CreateGameUseCase } from '../../../application/use-cases/create-game.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { PlayerColor } from '../../../shared/constants/game.constants';

const DEFAULT_TIME_MS = 5 * 60 * 1000; // 5-minute blitz

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(
    private readonly socialService: SocialService,
    private readonly gateway: GamesGateway,
    private readonly createGameUseCase: CreateGameUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post('follow/:username')
  async follow(
    @CurrentUser() user: { id: string },
    @Param('username') username: string,
  ) {
    return this.socialService.follow(user.id, username);
  }

  @Delete('unfollow/:username')
  async unfollow(
    @CurrentUser() user: { id: string },
    @Param('username') username: string,
  ) {
    return this.socialService.unfollow(user.id, username);
  }

  @Get('status/:username')
  async getStatus(
    @CurrentUser() user: { id: string },
    @Param('username') username: string,
  ) {
    const target = await this.prisma.user.findUnique({ where: { username } });
    if (!target) throw new NotFoundException('User not found');
    return this.socialService.getRelationshipState(user.id, target.id);
  }

  @Get('friends')
  async getFriends(@CurrentUser() user: { id: string }) {
    const friends = await this.socialService.getFriendsList(user.id);

    // Annotate each friend with live online status in one batch of SISMEMBER calls
    const withOnline = await Promise.all(
      friends.map(async (f) => ({
        ...f,
        isOnline: await this.gateway.isUserOnline(f.id),
      })),
    );

    // Online friends first
    return withOnline.sort((a, b) => Number(b.isOnline) - Number(a.isOnline));
  }

  @Get('following')
  async getFollowing(@CurrentUser() user: { id: string }) {
    return this.socialService.getFollowingList(user.id);
  }

  @Get('followers')
  async getFollowers(@CurrentUser() user: { id: string }) {
    return this.socialService.getFollowersList(user.id);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: { id: string }) {
    return this.socialService.getSocialStats(user.id);
  }

  /**
   * Send a challenge to a friend.
   * Creates a waiting invite game then emits challenge_request via WS
   * to the target user's personal socket room.
   */
  @Post('challenge/:username')
  async challenge(
    @CurrentUser() user: { id: string; rating?: number },
    @Param('username') username: string,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, displayName: true },
    });
    if (!target) throw new NotFoundException('User not found');

    const challenger = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        displayName: true,
        avatarUrl: true,
        rating: { select: { rating: true } },
      },
    });

    const elo = challenger?.rating?.rating ?? 1200;
    const challengerColor =
      Math.random() < 0.5 ? PlayerColor.WHITE : PlayerColor.BLACK;
    const { game, inviteCode } = await this.createGameUseCase.createInviteGame(
      user.id,
      challengerColor,
      elo,
      DEFAULT_TIME_MS,
    );

    this.gateway.emitChallengeRequest(target.id, {
      challengerId: user.id,
      challengerName: challenger?.displayName ?? 'Someone',
      challengerAvatarUrl: challenger?.avatarUrl,
      challengerRating: elo,
      inviteCode,
      gameId: game.id,
    });

    return { inviteCode, gameId: game.id };
  }
}
