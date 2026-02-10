import { Body, Controller, Post, HttpStatus, HttpCode } from '@nestjs/common';
import { EmailService } from '../../../infrastructure/email/email.service';
import { CreateSupportTicketDto } from '../dtos/support.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly emailService: EmailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createSupportTicket(
    @Body() createSupportTicketDto: CreateSupportTicketDto,
  ) {
    const { name, email, subject, message } = createSupportTicketDto;

    await this.emailService.sendSupportEmail(
      email,
      `${name}: ${subject}`,
      message,
    );

    return { message: 'Support ticket created successfully' };
  }
}
