import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { render } from '@react-email/render';
import * as Sentry from '@sentry/nestjs';
import { AnalyticsService } from '../../admin/analytics.service';
import { EmailService } from '../email/email.service';
import { AnalyticsReport } from './templates/analytics-report';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private analyticsService: AnalyticsService,
    private emailService: EmailService,
  ) {}

  /**
   * Fetch data, render template, and dispatch email.
   * Exposed publicly to allow manual triggers from AdminController.
   */
  async triggerReport(
    reportType: 'Daily' | 'Weekly' | 'Monthly',
  ): Promise<void> {
    try {
      this.logger.log(
        `Starting ${reportType.toLowerCase()} report generation...`,
      );

      // Get analytics data - Note: This currently fetches raw data,
      // the template handles pivoting based on window type.
      const analytics = await this.analyticsService.getAnalytics();

      // Generate HTML report
      const html = await render(
        AnalyticsReport({
          reportType,
          generatedAt: analytics.generatedAt,
          overview: analytics.overview,
          liveBreakdown: analytics.liveBreakdown,
          windows: analytics.windows as any,
        }),
      );

      // Send email using existing EmailService
      const reportDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await this.emailService.sendAnalyticsReport(html, reportDate, reportType);

      this.logger.log(
        `${reportType} report email sent successfully to kay@zetutech.co.tz`,
      );
    } catch (error) {
      this.logger.error(
        `Error generating/sending ${reportType.toLowerCase()} report:`,
        error,
      );
      Sentry.captureException(error, {
        tags: {
          task: 'report-generation',
          reportType,
        },
      });
    }
  }

  /**
   * Send daily analytics report email every day at 6:00 AM EAT (UTC+3)
   * Daily: "0 6 * * *" (6 AM EAT)
   */
  @Cron('0 6 * * *', { timeZone: 'Africa/Dar_es_Salaam' })
  async sendDailyReport(): Promise<void> {
    await this.triggerReport('Daily');
  }

  /**
   * Send weekly analytics report email every Monday at 6:00 AM EAT (UTC+3)
   * And Monthly report on the FIRST Monday of the month.
   * Weekly: "0 6 * * 1" (6 AM EAT on Mondays)
   */
  @Cron('0 6 * * 1', { timeZone: 'Africa/Dar_es_Salaam' })
  async sendWeeklyAndMonthlyReports(): Promise<void> {
    const today = new Date();

    // It's the first Monday of the month if the date is <= 7
    const isFirstMonday = today.getDate() <= 7;

    if (isFirstMonday) {
      this.logger.log(
        'Detected First Monday of the month. Triggering Monthly Report.',
      );
      await this.triggerReport('Monthly');
    } else {
      this.logger.log('Detected regular Monday. Triggering Weekly Report.');
      await this.triggerReport('Weekly');
    }
  }
}
