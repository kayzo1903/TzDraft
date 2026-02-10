import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { SupportNotification } from './templates/support-notification';
import { UserConfirmation } from './templates/user-confirmation';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not defined');
    }
    this.resend = new Resend(apiKey);
  }

  async sendSupportEmail(from: string, subject: string, message: string) {
    const supportEmail = this.configService.get<string>('SUPPORT_EMAIL');

    if (!supportEmail) {
      this.logger.error('SUPPORT_EMAIL is not defined');
      throw new Error('Support email configuration is missing');
    }

    try {
      const authDomain =
        this.configService.get<string>('RESEND_AUTH_DOMAIN') ||
        'onboarding@resend.dev';
      const fromEmail =
        authDomain === 'onboarding@resend.dev'
          ? authDomain
          : `support@${authDomain}`;

      // 1. Send Notification to Support Team
      const notificationHtml = await render(
        SupportNotification({
          name: from,
          email: from,
          subject,
          message,
        }),
      );

      const notificationResponse = await this.resend.emails.send({
        from: `Support Request <${fromEmail}>`,
        to: [supportEmail],
        subject: `[Support Request] ${subject}`,
        html: notificationHtml,
        replyTo: from,
      });

      if (notificationResponse.error) {
        this.logger.error(
          'Failed to send support notification',
          notificationResponse.error,
        );
        throw notificationResponse.error;
      }

      // 2. Send Confirmation to User
      try {
        const confirmationHtml = await render(
          UserConfirmation({
            name: from.split('@')[0],
          }),
        );

        await this.resend.emails.send({
          from: `TzDraft Support <${fromEmail}>`,
          to: [from],
          subject: 'We received your support request',
          html: confirmationHtml,
        });
      } catch (confirmationError) {
        this.logger.warn(
          'Failed to send user confirmation email',
          confirmationError,
        );
      }

      this.logger.log(
        `Support email sent successfully: ${notificationResponse.data?.id}`,
      );
      return notificationResponse;
    } catch (error) {
      this.logger.error('Failed to send support email', error);
      throw error;
    }
  }
}
