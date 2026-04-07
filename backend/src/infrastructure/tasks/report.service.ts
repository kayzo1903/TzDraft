import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { render } from '@react-email/render';
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
   * Helper to fetch data, render template, and dispatch email
   */
  private async dispatchReport(reportType: 'Daily' | 'Weekly' | 'Monthly'): Promise<void> {
    try {
      this.logger.log(`Starting ${reportType.toLowerCase()} report generation...`);

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
        })
      );

      // Send email using existing EmailService
      const reportDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // We'll repurpose the existing sendAnalyticsReport to accept dynamic subject internally?
      // Wait, let's look at emailService.sendAnalyticsReport. It hardcodes "Daily Report" in the subject!
      // I should update emailService.sendAnalyticsReport to accept reportType! 
      // For now, I will pass reportType to the updated method.
      await this.emailService.sendAnalyticsReport(html, reportDate, reportType);

      this.logger.log(`${reportType} report email sent successfully to kay@zetutech.co.tz`);
    } catch (error) {
      this.logger.error(`Error generating/sending ${reportType.toLowerCase()} report:`, error);
    }
  }

  /**
   * Send daily analytics report email every day at 6:00 AM EAT (UTC+3)
   * Daily: "0 3 * * *" (3 AM UTC = 6 AM EAT)
   */
  @Cron('0 3 * * *')
  async sendDailyReport(): Promise<void> {
    await this.dispatchReport('Daily');
  }

  /**
   * Send weekly analytics report email every Monday at 6:00 AM EAT (UTC+3)
   * And Monthly report on the FIRST Monday of the month.
   * Weekly: "0 3 * * 1" (3 AM UTC on Mondays)
   */
  @Cron('0 3 * * 1')
  async sendWeeklyAndMonthlyReports(): Promise<void> {
    const today = new Date();
    
    // It's the first Monday of the month if the date is <= 7
    const isFirstMonday = today.getDate() <= 7;

    // Send Monthly Report exclusively if it's the first Monday.
    // Otherwise, send the Weekly Report.
    if (isFirstMonday) {
      this.logger.log('Detected First Monday of the month. Triggering Monthly Report.');
      await this.dispatchReport('Monthly');
    } else {
      this.logger.log('Detected regular Monday. Triggering Weekly Report.');
      await this.dispatchReport('Weekly');
    }
  }
}