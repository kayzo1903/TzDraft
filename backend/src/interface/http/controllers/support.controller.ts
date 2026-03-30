import { Body, Controller, Post, HttpStatus, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EmailService } from '../../../infrastructure/email/email.service';
import { CreateSupportTicketDto } from '../dtos/support.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly emailService: EmailService) {}

  @Post()
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } }) // 5 tickets per IP per hour
  @HttpCode(HttpStatus.OK)
  async createSupportTicket(
    @Body() createSupportTicketDto: CreateSupportTicketDto,
  ) {
    const { name, email, subject, message } = createSupportTicketDto;

    await this.emailService.sendSupportEmail(
      name,
      email,
      subject,
      message,
    );

    return { message: 'Support ticket created successfully' };
  }
}
