"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GoogleStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_google_oauth20_1 = require("passport-google-oauth20");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("../auth.service");
let GoogleStrategy = GoogleStrategy_1 = class GoogleStrategy extends (0, passport_1.PassportStrategy)(passport_google_oauth20_1.Strategy, 'google') {
    configService;
    authService;
    constructor(configService, authService) {
        const logger = new common_1.Logger(GoogleStrategy_1.name);
        const clientID = configService.get('GOOGLE_CLIENT_ID') || '';
        const clientSecret = configService.get('GOOGLE_CLIENT_SECRET') || '';
        const port = configService.get('PORT') || '3002';
        const backendUrl = (configService.get('BACKEND_URL') || '').replace(/\/$/, '') ||
            `http://localhost:${port}`;
        const callbackURL = `${backendUrl}/auth/google/callback`;
        if (!clientID || !clientSecret) {
            logger.warn('Google OAuth credentials not configured');
        }
        if (process.env.NODE_ENV !== 'production') {
            logger.debug(`Google OAuth callback URL: ${callbackURL}`);
        }
        super({
            clientID,
            clientSecret,
            callbackURL,
            scope: ['email', 'profile'],
        });
        this.configService = configService;
        this.authService = authService;
    }
    async validate(accessToken, refreshToken, profile, done) {
        const { id, name, emails } = profile;
        const user = await this.authService.validateOAuthUser({
            googleId: id,
            email: emails[0].value,
            name: `${name.givenName} ${name.familyName}`,
            oauthProvider: 'google',
        });
        done(null, user);
    }
};
exports.GoogleStrategy = GoogleStrategy;
exports.GoogleStrategy = GoogleStrategy = GoogleStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        auth_service_1.AuthService])
], GoogleStrategy);
//# sourceMappingURL=google.strategy.js.map