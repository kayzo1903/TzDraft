export type OtpPurpose = 'signup' | 'password_reset' | 'verify_phone';
export declare class SendOtpDto {
    phoneNumber: string;
    purpose?: OtpPurpose;
}
export declare class VerifyOtpDto {
    phoneNumber: string;
    code: string;
    purpose?: OtpPurpose;
}
export declare class ResetPasswordPhoneDto {
    phoneNumber: string;
    code: string;
    newPassword: string;
}
