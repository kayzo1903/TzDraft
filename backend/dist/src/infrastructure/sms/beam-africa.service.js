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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var BeamAfricaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeamAfricaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let BeamAfricaService = BeamAfricaService_1 = class BeamAfricaService {
    config;
    logger = new common_1.Logger(BeamAfricaService_1.name);
    apiKey;
    secretKey;
    senderId;
    baseUrl = 'https://apisms.beem.africa';
    constructor(config) {
        this.config = config;
        this.apiKey = this.config.get('BEAM_AFRICA_API_KEY') || '';
        this.secretKey = this.config.get('BEAM_AFRICA_SECRET_KEY') || '';
        this.senderId =
            this.config.get('BEAM_AFRICA_SENDER_ID') || 'TzDraft';
        if (!this.apiKey || !this.secretKey) {
            this.logger.warn('Beam Africa credentials not configured');
        }
    }
    async sendOTP(phoneNumber, code) {
        try {
            const message = `Your TzDraft verification code is: ${code}. Valid for 5 minutes.`;
            const response = await axios_1.default.post(`${this.baseUrl}/v1/send`, {
                source_addr: this.senderId,
                schedule_time: '',
                encoding: 0,
                message: message,
                recipients: [
                    {
                        recipient_id: '1',
                        dest_addr: phoneNumber,
                    },
                ],
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64')}`,
                },
            });
            if (response.data.message?.includes('Successfully') ||
                response.data.code === 100) {
                this.logger.log(`OTP sent successfully to ${phoneNumber}`);
                return true;
            }
            else {
                this.logger.error(`Failed to send OTP: ${JSON.stringify(response.data)}`);
                return false;
            }
        }
        catch (error) {
            this.logger.error(`Error sending OTP: ${error.message}`);
            if (this.config.get('NODE_ENV') === 'development') {
                this.logger.log(`[DEV] OTP for ${phoneNumber}: ${code}`);
                return true;
            }
            return false;
        }
    }
    async getBalance() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/balance`, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'X-Secret-Key': this.secretKey,
                },
            });
            return response.data.balance || null;
        }
        catch (error) {
            this.logger.error(`Error fetching balance: ${error.message}`);
            return null;
        }
    }
};
exports.BeamAfricaService = BeamAfricaService;
exports.BeamAfricaService = BeamAfricaService = BeamAfricaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BeamAfricaService);
//# sourceMappingURL=beam-africa.service.js.map