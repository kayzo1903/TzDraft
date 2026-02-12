import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || '';
    const clientSecret =
      configService.get<string>('GOOGLE_CLIENT_SECRET') || '';
    const port = configService.get<string>('PORT') || '3002';

    const backendUrl =
      (configService.get<string>('BACKEND_URL') || '').replace(/\/$/, '') ||
      `http://localhost:${port}`;
    const callbackURL = `${backendUrl}/auth/google/callback`;

    console.log('🔍 Google OAuth Configuration:');
    console.log(
      'Client ID:',
      clientID ? `${clientID.substring(0, 20)}...` : 'MISSING',
    );
    console.log(
      'Client Secret:',
      clientSecret ? `${clientSecret.substring(0, 10)}...` : 'MISSING',
    );
    console.log('Callback URL:', callbackURL);

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails } = profile;

    const user = await this.authService.validateOAuthUser({
      googleId: id,
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      oauthProvider: 'google',
    });

    done(null, user);
  }
}
