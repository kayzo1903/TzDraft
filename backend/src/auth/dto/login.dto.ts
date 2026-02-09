import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  identifier: string; // Can be phone number or username

  @IsString()
  @MinLength(1)
  password: string;
}
