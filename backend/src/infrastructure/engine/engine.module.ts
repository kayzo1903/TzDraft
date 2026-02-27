// engine.module.ts
// NestJS module that registers and exports both engine adapters.
// Import this module wherever AI move generation is needed.

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KallistoAdapter } from './kallisto.adapter';
import { SidraAdapter } from './sidra.adapter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [KallistoAdapter, SidraAdapter],
  exports: [KallistoAdapter, SidraAdapter],
})
export class EngineModule {}
