import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { UserController } from '../../interface/http/controllers/user.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
