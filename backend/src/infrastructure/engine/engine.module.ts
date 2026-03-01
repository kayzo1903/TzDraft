// engine.module.ts
// NestJS module that registers and exports the SiDra engine adapter.
// Import this module wherever AI move generation is needed.

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SidraAdapter } from './sidra.adapter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SidraAdapter],
  exports: [SidraAdapter],
})
export class EngineModule {}
