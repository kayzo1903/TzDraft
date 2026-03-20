import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TurnService } from './turn.service';

@Controller('turn')
@UseGuards(JwtAuthGuard)
export class TurnController {
  constructor(private readonly turnService: TurnService) {}

  @Get('credentials')
  getCredentials(@CurrentUser() user: { id: string }) {
    return this.turnService.getCredentials(user.id);
  }
}
