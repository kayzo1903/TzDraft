import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GamesGateway } from './games.gateway';
import { MatchmakingService } from '../../application/services/matchmaking.service';
import { UseCasesModule } from '../../application/use-cases/use-cases.module';
import { RepositoryModule } from '../repositories/repository.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-key',
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
    forwardRef(() => UseCasesModule),
    RepositoryModule,
  ],
  providers: [GamesGateway, MatchmakingService],
  exports: [GamesGateway],
})
export class MessagingModule {}
