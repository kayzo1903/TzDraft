import { IsEnum, IsBoolean, IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export class AdminUsersQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateUserBanDto {
  @IsBoolean()
  isBanned: boolean;
}
