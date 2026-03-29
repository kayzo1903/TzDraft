import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { INotificationRepository } from '../../../domain/notification/repositories/notification.repository.interface';
import { Inject } from '@nestjs/common';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    @Inject('INotificationRepository')
    private readonly notifRepo: INotificationRepository,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const notifications = await this.notifRepo.findByUserId(
      user.id,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
    return notifications;
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: { id: string }) {
    const count = await this.notifRepo.countUnread(user.id);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.notifRepo.markRead(id, user.id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentUser() user: { id: string }) {
    await this.notifRepo.markAllRead(user.id);
  }
}
