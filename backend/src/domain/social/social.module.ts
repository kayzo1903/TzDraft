import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { UseCasesModule } from '../../application/use-cases/use-cases.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UseCasesModule],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
