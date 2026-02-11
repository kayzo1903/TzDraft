import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export type OtpPurpose = 'signup' | 'password_reset' | 'verify_phone';

export class SendOtpDto {
  @IsString()
  @Matches(/^(0|255|\+255)?[67]\d{8}$/, {
    message: 'Phone number must be a valid Tanzanian number',
  })
  phoneNumber: string;

  @IsOptional()
  @IsIn(['signup', 'password_reset', 'verify_phone'])
  purpose?: OtpPurpose;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^(0|255|\+255)?[67]\d{8}$/, {
    message: 'Phone number must be a valid Tanzanian number',
  })
  phoneNumber: string;

  @Matches(/^\d{6}$/, {
    message: 'OTP code must be 6 digits',
  })
  code: string;

  @IsOptional()
  @IsIn(['signup', 'password_reset', 'verify_phone'])
  purpose?: OtpPurpose;
}

export class ResetPasswordPhoneDto {
  @IsString()
  @Matches(/^(0|255|\+255)?[67]\d{8}$/, {
    message: 'Phone number must be a valid Tanzanian number',
  })
  phoneNumber: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP code must be 6 digits',
  })
  code: string;

  @IsString()
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  newPassword: string;
}
