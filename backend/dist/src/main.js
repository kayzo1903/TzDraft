"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const express_1 = require("express");
async function bootstrap() {
    const isProd = process.env.NODE_ENV === 'production';
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: isProd ? false : undefined,
    });
    app.set('trust proxy', 1);
    app.use((0, express_1.json)());
    if (process.env.AUTH_DEBUG_LOG === 'true') {
        app.use((req, _res, next) => {
            if (req.path === '/auth/login' && req.method === 'POST') {
                const body = req.body;
                const identifier = body?.identifier;
                const password = body?.password;
                console.log('[AUTH_LOGIN_DEBUG]', JSON.stringify({
                    method: req.method,
                    path: req.path,
                    origin: req.headers.origin,
                    contentType: req.headers['content-type'],
                    contentLength: req.headers['content-length'],
                    transferEncoding: req.headers['transfer-encoding'],
                    userAgent: req.headers['user-agent'],
                    bodyType: body === null ? 'null' : typeof body,
                    bodyKeys: body && typeof body === 'object' ? Object.keys(body) : null,
                    identifierType: typeof identifier,
                    identifierLength: typeof identifier === 'string' ? identifier.length : null,
                    passwordType: typeof password,
                    passwordLength: typeof password === 'string' ? password.length : null,
                    isReadable: req.readable,
                    has_body: '_body' in req,
                }));
            }
            next();
        });
    }
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
        .filter(Boolean)
        .flatMap((origin) => {
        if (origin === '*')
            return ['*'];
        if (origin.startsWith('http://') || origin.startsWith('https://')) {
            return [origin];
        }
        return [`https://${origin}`, `http://${origin}`];
    });
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