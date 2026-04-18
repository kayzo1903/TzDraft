import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { AdminGuard } from './guards/admin.guard';
import { UserModule } from '../domain/user/user.module';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { BeamAfricaService } from '../infrastructure/sms/beam-africa.service';
import { StorageModule } from '../infrastructure/storage/storage.module';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    StorageModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m', // Short-lived access token
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    BeamAfricaService,
    JwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    WsJwtGuard,
    AdminGuard,
  ],
  exports: [
    JwtStrategy,
    PassportModule,
    JwtAuthGuard,
    WsJwtGuard,
    AuthService,
    AdminGuard,
  ],
})
export class AuthModule {}
