export declare class SendOtpDto {
    phoneNumber: string;
}
export declare class VerifyOtpDto {
    phoneNumber: string;
    code: string;
}
export declare class ResetPasswordPhoneDto {
    phoneNumber: string;
    code: string;
    newPassword: string;
}
