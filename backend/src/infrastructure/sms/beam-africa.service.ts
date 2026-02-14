import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Beam Africa SMS Service
 * Handles OTP sending via Beam Africa API
 */
@Injectable()
export class BeamAfricaService {
  private readonly logger = new Logger(BeamAfricaService.name);
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly senderId: string;
  private readonly baseUrl = 'https://apisms.beem.africa';

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('BEAM_AFRICA_API_KEY') || '';
    this.secretKey = this.config.get<string>('BEAM_AFRICA_SECRET_KEY') || '';
    this.senderId =
      this.config.get<string>('BEAM_AFRICA_SENDER_ID') || 'TzDraft';

    if (!this.apiKey || !this.secretKey) {
      this.logger.warn('Beam Africa credentials not configured');
    }
  }

  /**
   * Send OTP via SMS
   * @param phoneNumber - Phone number in E.164 format (+255...)
   * @param code - OTP code to send
   * @returns Promise<boolean> - true if sent successfully
   */
  async sendOTP(phoneNumber: string, code: string): Promise<boolean> {
    try {
      // Log API configuration (without exposing secrets)
      this.logger.log(`[BEAM_AFRICA] Attempting to send OTP to ${phoneNumber}`);
      this.logger.log(`[BEAM_AFRICA] API Key configured: ${!!this.apiKey}`);
      this.logger.log(
        `[BEAM_AFRICA] Secret Key configured: ${!!this.secretKey}`,
      );
      this.logger.log(`[BEAM_AFRICA] Sender ID: ${this.senderId}`);

      const message = `Your TzDraft verification code is: ${code}. Valid for 5 minutes.`;

      const response = await axios.post(
        `${this.baseUrl}/v1/send`,
        {
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
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64')}`,
          },
        },
      );

      this.logger.log(
        `[BEAM_AFRICA] Response: ${JSON.stringify(response.data)}`,
      );

      // Beem Africa returns success with message "Message Submitted Successfully"
      if (
        response.data.message?.includes('Successfully') ||
        response.data.code === 100
      ) {
        this.logger.log(`OTP sent successfully to ${phoneNumber}`);
        return true;
      } else {
        this.logger.error(
          `Failed to send OTP: ${JSON.stringify(response.data)}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`[BEAM_AFRICA] Error sending OTP: ${error.message}`);
      this.logger.error(
        `[BEAM_AFRICA] Error details: ${JSON.stringify(error.response?.data || error)}`,
      );

      // In development, log the OTP for testing
      if (this.config.get('NODE_ENV') === 'development') {
        this.logger.log(`[DEV] OTP for ${phoneNumber}: ${code}`);
        return true; // Simulate success in development
      }

      return false;
    }
  }

  /**
   * Check account balance (optional utility)
   */
  async getBalance(): Promise<number | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/balance`, {
        headers: {
          'X-API-Key': this.apiKey,
          'X-Secret-Key': this.secretKey,
        },
      });

      return response.data.balance || null;
    } catch (error) {
      this.logger.error(`Error fetching balance: ${error.message}`);
      return null;
    }
  }
}
