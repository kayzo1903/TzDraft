import { Module } from '@nestjs/common';
import { SidraEngineService } from './sidra-engine.service';

@Module({
  providers: [SidraEngineService],
  exports: [SidraEngineService],
})
export class EngineModule {}
