// engine.module.ts
// NestJS module that registers and exports the Mkaguzi engine adapter.
// Import this module wherever AI move generation or analysis is needed.

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MkaguziAdapter } from './mkaguzi.adapter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MkaguziAdapter],
  exports: [MkaguziAdapter],
})
export class EngineModule {}
