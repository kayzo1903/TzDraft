import { EmailService } from '../../../infrastructure/email/email.service';
import { CreateSupportTicketDto } from '../dtos/support.dto';
export declare class SupportController {
    private readonly emailService;
    constructor(emailService: EmailService);
    createSupportTicket(createSupportTicketDto: CreateSupportTicketDto): Promise<{
        message: string;
    }>;
}
