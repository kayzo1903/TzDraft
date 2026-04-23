import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SocialService } from '../../../domain/social/social.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

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
    // We need the target user ID, so we might need to fetch the user first
    // or modify the service to accept username. For now, let's assume we need to fetch.
    const targetUser = await (this.socialService as any).prisma.user.findUnique({
      where: { username },
    });
    if (!targetUser) return { error: 'User not found' };
    
    return this.socialService.getRelationshipState(user.id, targetUser.id);
  }

  @Get('friends')
  async getFriends(@CurrentUser() user: { id: string }) {
    return this.socialService.getFriendsList(user.id);
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
}
