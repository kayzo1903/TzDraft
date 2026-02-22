import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { UserService } from '../../../domain/user/user.service';
import { fuzzySearch } from '../../../lib/string-similarity.util';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchUsers(@Query('q') query?: string) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search term required');
    }

    if (query.length > 50) {
      throw new BadRequestException('Search term too long');
    }

    try {
      // Get all users (in production, consider pagination)
      const users = await this.userService.findAll();

      // Fuzzy search users by displayName primarily
      // displayName has 100% weight (only search by display name)
      const results = fuzzySearch(
        query,
        users,
        (user) => [
          { value: user.displayName, weight: 1.0 },
        ],
        100, // Require 100% exact match only
      );

      // Return top 10 results with score and user data
      return results.slice(0, 10).map(({ item, score }) => ({
        id: item.id,
        username: item.username,
        displayName: item.displayName,
        rating: (item as any).rating?.rating || 1200,
        matchScore: score,
        isVerified: item.isVerified,
      }));
    } catch (error) {
      // Log error but return generic message
      console.error('Search error:', error);
      throw new BadRequestException('Search failed');
    }
  }
}
