import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../../../auth/decorators/public.decorator';

@Controller('system')
export class SystemController {
  @Get('time')
  @Public()
  @HttpCode(HttpStatus.OK)
  getServerTime() {
    const now = new Date();
    return {
      serverTimeMs: now.getTime(),
      iso: now.toISOString(),
    };
  }
}
