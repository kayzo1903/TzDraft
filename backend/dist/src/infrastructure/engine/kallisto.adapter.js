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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KallistoAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KallistoAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let KallistoAdapter = KallistoAdapter_1 = class KallistoAdapter {
    configService;
    name = 'Kallisto';
    logger = new common_1.Logger(KallistoAdapter_1.name);
    defaultTimeLimitMs;
    cliPath;
    constructor(configService) {
        this.configService = configService;
        this.defaultTimeLimitMs = parseInt(this.configService.get('KALLISTO_TIME_LIMIT_MS') || '3000', 10);
    }
    onModuleInit() {
        const envPath = this.configService.get('KALLISTO_CLI_PATH');
        if (envPath && fs.existsSync(envPath)) {
            this.cliPath = envPath;
        }
        else {
            const projectRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
            this.cliPath = path.join(projectRoot, 'engines', 'kallisto', 'kallisto-cli.exe');
        }
        if (!fs.existsSync(this.cliPath)) {
            this.logger.warn(`kallisto-cli.exe not found at: ${this.cliPath}. ` +
                `Build it first: cd engines\\kallisto && build_kallisto_cli.bat`);
        }
        else {
            this.logger.log(`Kallisto CLI resolved at: ${this.cliPath}`);
        }
    }
    onModuleDestroy() {
        this.logger.log('KallistoAdapter destroyed.');
    }
    dispose() {
    }
    async getBestMove(request) {
        if (!fs.existsSync(this.cliPath)) {
            throw new Error(`Kallisto CLI not found. Build it first at: ${this.cliPath}`);
        }
        const timeLimitMs = request.timeLimitMs ?? this.defaultTimeLimitMs;
        const inputJson = JSON.stringify({
            currentPlayer: request.currentPlayer,
            timeLimitMs,
            pieces: request.pieces,
            aiLevel: request.aiLevel ?? null,
            mustContinueFrom: request.mustContinueFrom ?? null,
        });
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.execFile)(this.cliPath, [], { timeout: timeLimitMs + 2000, maxBuffer: 1024 * 64 }, (error, stdout, stderr) => {
                if (stderr) {
                    this.logger.debug(`[kallisto-cli stderr] ${stderr.trim()}`);
                }
                if (error) {
                    this.logger.error(`Kallisto process error: ${error.message}`);
                    reject(error);
                    return;
                }
                try {
                    const result = JSON.parse(stdout.trim());
                    if (result.from === -1) {
                        resolve(null);
                    }
                    else {
                        resolve(result);
                    }
                }
                catch (parseErr) {
                    this.logger.error(`Failed to parse Kallisto output: ${stdout.trim()}`);
                    reject(parseErr);
                }
            });
            child.stdin?.write(inputJson);
            child.stdin?.end();
        });
    }
};
exports.KallistoAdapter = KallistoAdapter;
exports.KallistoAdapter = KallistoAdapter = KallistoAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KallistoAdapter);
//# sourceMappingURL=kallisto.adapter.js.map