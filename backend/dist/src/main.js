"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const express = __importStar(require("express"));
async function bootstrap() {
    const isProd = process.env.NODE_ENV === 'production';
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: isProd ? false : undefined,
    });
    app.use(express.json({ limit: '1mb', type: ['application/json', 'application/*+json'] }));
    app.use(express.urlencoded({ extended: true }));
    app.use('/auth/login', (req, _res, next) => {
        if (process.env.AUTH_DEBUG_LOG === 'true') {
            const body = req.body;
            const identifier = body?.identifier;
            const password = body?.password;
            console.log('[AUTH_LOGIN_DEBUG]', JSON.stringify({
                method: req.method,
                path: req.path,
                origin: req.headers.origin,
                contentType: req.headers['content-type'],
                bodyType: body === null ? 'null' : typeof body,
                bodyKeys: body && typeof body === 'object' ? Object.keys(body) : null,
                identifierType: typeof identifier,
                identifierLength: typeof identifier === 'string' ? identifier.length : null,
                passwordType: typeof password,
                passwordLength: typeof password === 'string' ? password.length : null,
            }));
        }
        next();
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const configService = app.get(config_1.ConfigService);
    const corsOriginsRaw = configService.get('CORS_ORIGINS') ||
        configService.get('CORS_ORIGIN') ||
        configService.get('FRONTEND_URL') ||
        configService.get('APP_URL') ||
        'http://localhost:3000';
    const allowedOrigins = corsOriginsRaw
        .split(/[,\n]/g)
        .map((origin) => origin.trim())
        .map((origin) => {
        if (origin.length >= 2 &&
            origin[0] === origin[origin.length - 1] &&
            (origin[0] === '"' || origin[0] === "'")) {
            return origin.slice(1, -1).trim();
        }
        return origin;
    })
        .map((origin) => origin.replace(/\/$/, ''))
        .filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            const normalizedOrigin = origin.replace(/\/$/, '');
            if (allowedOrigins.includes('*'))
                return callback(null, true);
            if (allowedOrigins.includes(normalizedOrigin))
                return callback(null, true);
            for (const allowedOrigin of allowedOrigins) {
                if (!allowedOrigin.includes('*'))
                    continue;
                try {
                    const allowed = new URL(allowedOrigin.replace('*.', ''));
                    const incoming = new URL(normalizedOrigin);
                    if (incoming.protocol !== allowed.protocol)
                        continue;
                    if (incoming.port !== allowed.port)
                        continue;
                    const allowedHost = allowed.hostname;
                    const incomingHost = incoming.hostname;
                    if (incomingHost === allowedHost)
                        continue;
                    if (incomingHost.endsWith(`.${allowedHost}`))
                        return callback(null, true);
                }
                catch {
                }
            }
            try {
                const incoming = new URL(normalizedOrigin);
                const incomingHost = incoming.hostname;
                const wwwToggledHost = incomingHost.startsWith('www.')
                    ? incomingHost.slice(4)
                    : `www.${incomingHost}`;
                const toggledOrigin = `${incoming.protocol}//${wwwToggledHost}${incoming.port ? `:${incoming.port}` : ''}`;
                if (allowedOrigins.includes(toggledOrigin))
                    return callback(null, true);
            }
            catch {
            }
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        optionsSuccessStatus: 204,
    });
    const port = configService.get('PORT') || 3002;
    await app.listen(port, '0.0.0.0');
    if (!isProd) {
        new common_1.Logger('Bootstrap').log(`TzDraft server listening on port ${port}`);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map