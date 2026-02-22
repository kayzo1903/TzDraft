import { Module } from '@nestjs/common';
import { SidraEngineService } from './sidra-engine.service';
import { KallistoEngineService } from './kallisto-engine.service';
import { EgtbService } from './egtb.service';

@Module({
  providers: [SidraEngineService, KallistoEngineService, EgtbService],
  exports: [SidraEngineService, KallistoEngineService, EgtbService],
})
export class EngineModule {}
