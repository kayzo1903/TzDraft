import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  MaxLength,
} from 'class-validator';

export enum SupportSubject {
  BUG = 'Bug Report',
  ACCOUNT = 'Account Issue',
  GENERAL = 'General Inquiry',
  FEEDBACK = 'Feedback',
  TOURNAMENT = 'Tournament Issue',
  SAFETY = 'Safety or Policy Report',
}

export class CreateSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsEnum(SupportSubject)
  subject: SupportSubject;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  message: string;
}
