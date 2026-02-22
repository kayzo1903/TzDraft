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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const resend_1 = require("resend");
const render_1 = require("@react-email/render");
const support_notification_1 = require("./templates/support-notification");
const user_confirmation_1 = require("./templates/user-confirmation");
let EmailService = EmailService_1 = class EmailService {
    configService;
    resend;
    logger = new common_1.Logger(EmailService_1.name);
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('RESEND_API_KEY');
        if (!apiKey) {
            this.logger.error('RESEND_API_KEY is not defined');
        }
        this.resend = new resend_1.Resend(apiKey);
    }
    async sendSupportEmail(from, subject, message) {
        const supportEmail = this.configService.get('SUPPORT_EMAIL');
        if (!supportEmail) {
            this.logger.error('SUPPORT_EMAIL is not defined');
            throw new Error('Support email configuration is missing');
        }
        try {
            const authDomain = this.configService.get('RESEND_AUTH_DOMAIN') ||
                'onboarding@resend.dev';
            const fromEmail = authDomain === 'onboarding@resend.dev'
                ? authDomain
                : `support@${authDomain}`;
            const notificationHtml = await (0, render_1.render)((0, support_notification_1.SupportNotification)({
                name: from,
                email: from,
                subject,
                message,
            }));
            const notificationResponse = await this.resend.emails.send({
                from: `Support Request <${fromEmail}>`,
                to: [supportEmail],
                subject: `[Support Request] ${subject}`,
                html: notificationHtml,
                replyTo: from,
            });
            if (notificationResponse.error) {
                this.logger.error('Failed to send support notification', notificationResponse.error);
                throw notificationResponse.error;
            }
            try {
                const confirmationHtml = await (0, render_1.render)((0, user_confirmation_1.UserConfirmation)({
                    name: from.split('@')[0],
                }));
                await this.resend.emails.send({
                    from: `TzDraft Support <${fromEmail}>`,
                    to: [from],
                    subject: 'We received your support request',
                    html: confirmationHtml,
                });
            }
            catch (confirmationError) {
                this.logger.warn('Failed to send user confirmation email', confirmationError);
            }
            this.logger.log(`Support email sent successfully: ${notificationResponse.data?.id}`);
            return notificationResponse;
        }
        catch (error) {
            this.logger.error('Failed to send support email', error);
            throw error;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map