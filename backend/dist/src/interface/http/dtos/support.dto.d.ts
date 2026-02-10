export declare enum SupportSubject {
    BUG = "Bug Report",
    ACCOUNT = "Account Issue",
    GENERAL = "General Inquiry",
    FEEDBACK = "Feedback"
}
export declare class CreateSupportTicketDto {
    name: string;
    email: string;
    subject: string;
    message: string;
}
