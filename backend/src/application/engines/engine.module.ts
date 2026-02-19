import { Module } from '@nestjs/common';
import { SidraEngineService } from './sidra-engine.service';
import { KallistoEngineService } from './kallisto-engine.service';

@Module({
  providers: [SidraEngineService, KallistoEngineService],
  exports: [SidraEngineService, KallistoEngineService],
})
export class EngineModule {}
