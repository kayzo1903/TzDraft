import { IsUUID, IsNotEmpty } from 'class-validator';

export class RejectFriendRequestDto {
  @IsUUID()
  @IsNotEmpty()
  requesterId: string;
}
