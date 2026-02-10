import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum SupportSubject {
  BUG = 'Bug Report',
  ACCOUNT = 'Account Issue',
  GENERAL = 'General Inquiry',
  FEEDBACK = 'Feedback',
}

export class CreateSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString() // OR @IsEnum(SupportSubject) if we want to enforce it strictly
  subject: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}
