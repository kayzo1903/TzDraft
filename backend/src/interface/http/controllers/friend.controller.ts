import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import {
  SendFriendRequestUseCase,
  AcceptFriendRequestUseCase,
  RejectFriendRequestUseCase,
  GetFriendsUseCase,
  GetPendingFriendRequestsUseCase,
  RemoveFriendUseCase,
  GetSentFriendRequestsUseCase,
  CancelFriendRequestUseCase,
} from '../../../application/use-cases';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import {
  SendFriendRequestDto,
  AcceptFriendRequestDto,
  RejectFriendRequestDto,
  RemoveFriendDto,
} from '../dtos';

/**
 * Friend Controller
 * Handles friend-related HTTP endpoints
 */
@ApiTags('friends')
@ApiBearerAuth()
@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendController {
  constructor(
    private readonly sendFriendRequestUseCase: SendFriendRequestUseCase,
    private readonly acceptFriendRequestUseCase: AcceptFriendRequestUseCase,
    private readonly rejectFriendRequestUseCase: RejectFriendRequestUseCase,
    private readonly getFriendsUseCase: GetFriendsUseCase,
    private readonly getPendingFriendRequestsUseCase: GetPendingFriendRequestsUseCase,
    private readonly removeFriendUseCase: RemoveFriendUseCase,
    private readonly getSentFriendRequestsUseCase: GetSentFriendRequestsUseCase,
    private readonly cancelFriendRequestUseCase: CancelFriendRequestUseCase,
    private readonly gamesGateway: GamesGateway,
  ) {}

  /**
   * Send a friend request to another user
   */
  @Post('requests/send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a friend request to another user' })
  @ApiResponse({ status: 201, description: 'Friend request sent successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or already friends',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async sendFriendRequest(
    @CurrentUser() user: any,
    @Body() dto: SendFriendRequestDto,
  ) {
    return await this.sendFriendRequestUseCase.execute(user.id, dto.friendId);
  }

  /**
   * Accept a friend request
   */
  @Post('requests/:requesterId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a friend request from another user' })
  @ApiResponse({
    status: 200,
    description: 'Friend request accepted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid request' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async acceptFriendRequest(
    @CurrentUser() user: any,
    @Param('requesterId') requesterId: string,
  ) {
    return await this.acceptFriendRequestUseCase.execute(requesterId, user.id);
  }

  /**
   * Reject a friend request
   */
  @Post('requests/:requesterId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a friend request from another user' })
  @ApiResponse({
    status: 200,
    description: 'Friend request rejected successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid request' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async rejectFriendRequest(
    @CurrentUser() user: any,
    @Param('requesterId') requesterId: string,
  ) {
    return await this.rejectFriendRequestUseCase.execute(requesterId, user.id);
  }

  /**
   * Cancel a sent friend request
   */
  @Delete('requests/:requesteeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a sent friend request' })
  @ApiResponse({
    status: 204,
    description: 'Friend request canceled successfully',
  })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async cancelFriendRequest(
    @CurrentUser() user: any,
    @Param('requesteeId') requesteeId: string,
  ) {
    await this.cancelFriendRequestUseCase.execute(user.id, requesteeId);
  }

  /**
   * Get all friends of the current user
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all friends of the current user' })
  @ApiResponse({ status: 200, description: 'Friends retrieved successfully' })
  async getFriends(@CurrentUser() user: any) {
    return await this.getFriendsUseCase.execute(user.id);
  }

  /**
   * Get online statuses for current user's friends
   */
  @Get('online')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get current user's online friends" })
  @ApiResponse({ status: 200, description: 'Online friend IDs returned' })
  async getOnlineFriends(@CurrentUser() user: any) {
    const friends = await this.getFriendsUseCase.execute(user.id);
    const friendIds = (friends || []).map((f: any) => f.id);
    const onlineIds = await this.gamesGateway.getOnlineParticipantIds(friendIds);
    return {
      onlineIds,
      onlineMap: friendIds.reduce(
        (acc: Record<string, boolean>, id: string) => {
          acc[id] = onlineIds.includes(id);
          return acc;
        },
        {},
      ),
    };
  }

  /**
   * Get pending friend requests for the current user
   */
  @Get('requests/pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all pending friend requests for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending requests retrieved successfully',
  })
  async getPendingRequests(@CurrentUser() user: any) {
    return await this.getPendingFriendRequestsUseCase.execute(user.id);
  }

  /**
   * Get sent friend requests for the current user
   */
  @Get('requests/sent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all sent friend requests for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Sent requests retrieved successfully',
  })
  async getSentRequests(@CurrentUser() user: any) {
    return await this.getSentFriendRequestsUseCase.execute(user.id);
  }

  /**
   * Remove a friend
   */
  @Delete(':friendId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a friend' })
  @ApiResponse({ status: 204, description: 'Friend removed successfully' })
  @ApiResponse({ status: 404, description: 'Friendship not found' })
  async removeFriend(
    @CurrentUser() user: any,
    @Param('friendId') friendId: string,
  ) {
    return await this.removeFriendUseCase.execute(user.id, friendId);
  }
}
