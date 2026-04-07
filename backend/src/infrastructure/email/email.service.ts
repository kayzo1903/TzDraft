import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { SupportNotification } from './templates/support-notification';
import { UserConfirmation } from './templates/user-confirmation';
import { TournamentRegistered } from './templates/tournament-registered';
import { TournamentStarted } from './templates/tournament-started';
import { MatchAssigned } from './templates/match-assigned';
import { TournamentResult } from './templates/tournament-result';

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

  async sendSupportEmail(
    name: string,
    email: string,
    subject: string,
    message: string,
  ) {
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
          name,
          email,
          subject,
          message,
        }),
      );

      const notificationResponse = await this.resend.emails.send({
        from: `Support Request <${fromEmail}>`,
        to: [supportEmail],
        subject: `[Support Request] ${subject}`,
        html: notificationHtml,
        replyTo: email,
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
            name,
            subject,
          }),
        );

        await this.resend.emails.send({
          from: `TzDraft Support <${fromEmail}>`,
          to: [email],
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

  private get fromEmail(): string {
    const authDomain =
      this.configService.get<string>('RESEND_AUTH_DOMAIN') ||
      'onboarding@resend.dev';
    return authDomain === 'onboarding@resend.dev'
      ? authDomain
      : `noreply@${authDomain}`;
  }

  /** Fire-and-forget helper — logs error but never throws. */
  private async sendQuiet(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.resend.emails.send({
        from: `TzDraft <${this.fromEmail}>`,
        to: [to],
        subject,
        html,
      });
    } catch (err) {
      this.logger.warn(`Email to ${to} (${subject}) failed: ${err?.message}`);
    }
  }

  async sendTournamentRegistered(
    userEmail: string,
    name: string,
    tournamentName: string,
    scheduledStartAt: string,
    format: string,
    style: string,
  ): Promise<void> {
    const html = await render(
      TournamentRegistered({
        name,
        tournamentName,
        scheduledStartAt,
        format,
        style,
      }),
    );
    await this.sendQuiet(
      userEmail,
      `You're registered for ${tournamentName}!`,
      html,
    );
  }

  async sendTournamentStarted(
    userEmail: string,
    name: string,
    tournamentName: string,
    roundNumber: number,
    matchesCount: number,
  ): Promise<void> {
    const html = await render(
      TournamentStarted({ name, tournamentName, roundNumber, matchesCount }),
    );
    await this.sendQuiet(
      userEmail,
      `${tournamentName} has started — Round ${roundNumber} is live!`,
      html,
    );
  }

  async sendMatchAssigned(
    userEmail: string,
    name: string,
    opponentDisplayName: string,
    tournamentName: string,
    roundNumber: number,
    style: string,
  ): Promise<void> {
    const html = await render(
      MatchAssigned({
        name,
        opponentDisplayName,
        tournamentName,
        roundNumber,
        style,
      }),
    );
    await this.sendQuiet(
      userEmail,
      `Your Round ${roundNumber} match vs ${opponentDisplayName} is ready!`,
      html,
    );
  }

  async sendMatchResult(
    userEmail: string,
    name: string,
    tournamentName: string,
    outcome: 'winner' | 'eliminated',
    score?: string,
    roundNumber?: number,
  ): Promise<void> {
    const html = await render(
      TournamentResult({ name, tournamentName, outcome, score, roundNumber }),
    );
    const subject =
      outcome === 'winner'
        ? `You won your Round ${roundNumber} match in ${tournamentName}!`
        : `You've been eliminated from ${tournamentName}`;
    await this.sendQuiet(userEmail, subject, html);
  }

  async sendTournamentCompleted(
    userEmail: string,
    name: string,
    tournamentName: string,
    winnerDisplayName: string,
  ): Promise<void> {
    const html = await render(
      TournamentResult({
        name,
        tournamentName,
        outcome: 'completed',
        winnerDisplayName,
      }),
    );
    await this.sendQuiet(
      userEmail,
      `${tournamentName} is over — see the results!`,
      html,
    );
  }

  async sendAnalyticsReport(html: string, reportDate: string, reportType: 'Daily' | 'Weekly' | 'Monthly' = 'Daily') {
    try {
      const { error } = await this.resend.emails.send({
        from: `TzDraft <${this.fromEmail}>`,
        to: 'kay@zetutech.co.tz',
        subject: `TzDraft ${reportType} Report - ${reportDate}`,
        html,
      });

      if (error) {
        this.logger.error('Failed to send analytics report email:', error);
        throw error;
      }

      this.logger.log('Analytics report email sent successfully');
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send analytics report email', error);
      throw error;
    }
  }
}
