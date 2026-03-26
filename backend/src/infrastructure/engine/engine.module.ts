// engine.module.ts
// NestJS module that registers and exports engine adapters (SiDra + Mkaguzi).
// Import this module wherever AI move generation or analysis is needed.

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SidraAdapter } from './sidra.adapter';
import { MkaguziAdapter } from './mkaguzi.adapter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SidraAdapter, MkaguziAdapter],
  exports: [SidraAdapter, MkaguziAdapter],
})
export class EngineModule {}
