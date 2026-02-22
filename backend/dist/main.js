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
        bodyParser: false,
    });
    const configService = app.get(config_1.ConfigService);
    const isDevelopment = (configService.get('NODE_ENV') || 'development') !== 'production';
    app.set('trust proxy', 1);
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
    const explicitOrigins = Array.from(new Set([
        ...allowedOrigins,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'https://tzdraft.com',
        'https://www.tzdraft.com',
    ].filter(Boolean)));
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (isDevelopment) {
                return callback(null, true);
            }
            if (explicitOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`CORS blocked origin: ${origin}`), false);
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
    app.use((req, res, next) => {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.toLowerCase().includes('json')) {
            return next();
        }
        const chunks = [];
        let totalSize = 0;
        const MAX_SIZE = 1024 * 1024;
        req.on('data', (chunk) => {
            totalSize += chunk.length;
            if (totalSize > MAX_SIZE) {
                req.removeAllListeners('data');
                req.removeAllListeners('end');
                res.status(413).json({ error: 'Payload too large' });
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8');
                if (process.env.AUTH_DEBUG_LOG === 'true' &&
                    req.url?.includes('/auth/login')) {
                    console.log('[CUSTOM_PARSER] Raw buffer length:', raw.length);
                }
                if (raw.length === 0) {
                    req.body = {};
                }
                else {
                    req.body = JSON.parse(raw);
                }
                next();
            }
            catch (err) {
                console.error('[CUSTOM_PARSER] JSON parse error:', err);
                res.status(400).json({ error: 'Invalid JSON' });
            }
        });
        req.on('error', (err) => {
            console.error('[CUSTOM_PARSER] Stream error:', err);
            res.status(400).json({ error: 'Request error' });
        });
    });
    app.use((0, express_1.urlencoded)({ extended: true }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const port = configService.get('PORT') || 3002;
    await app.listen(port, '0.0.0.0');
    if (!isProd) {
        new common_1.Logger('Bootstrap').log(`TzDraft server listening on port ${port}`);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map