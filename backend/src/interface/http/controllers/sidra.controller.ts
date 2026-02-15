import { Body, Controller, Post } from '@nestjs/common';
import { SidraEngineService } from '../../../application/engines/sidra-engine.service';
import type { SidraMoveRequest } from '../../../application/engines/sidra-types';

@Controller('engines/sidra')
export class SidraController {
  constructor(private readonly sidraEngine: SidraEngineService) {}

  @Post('move')
  async getMove(@Body() body: SidraMoveRequest) {
    const move = await this.sidraEngine.getMove(body);
    return { move };
  }
}
