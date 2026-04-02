import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { render } from '@react-email/render';
import { AdminController } from '../../interface/http/controllers/admin.controller';
import { EmailService } from '../email/email.service';
import { DailyReport } from './templates/daily-report';

@Injectable()
export class DailyReportService {
  private readonly logger = new Logger(DailyReportService.name);

  constructor(
    private adminController: AdminController,
    private emailService: EmailService,
  ) {}

  /**
   * Send daily analytics report email every day at 6:00 AM EAT (UTC+3)
   * Cron expression: "0 3 * * *" (3 AM UTC = 6 AM EAT)
   */
  @Cron('0 3 * * *')
  async sendDailyReport(): Promise<void> {
    try {
      this.logger.log('Starting daily report generation...');

      // Get analytics data
      const analytics = await this.adminController.getAnalytics();

      // Generate HTML report
      const html = await render(
        DailyReport({
          generatedAt: analytics.generatedAt,
          overview: analytics.overview,
          liveBreakdown: analytics.liveBreakdown,
          windows: analytics.windows,
        })
      );

      // Send email using existing EmailService
      const reportDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await this.emailService.sendAnalyticsReport(html, reportDate);

      this.logger.log('Daily report email sent successfully to kay@zetutech.co.tz');
    } catch (error) {
      this.logger.error('Error generating/sending daily report:', error);
    }
  }
}