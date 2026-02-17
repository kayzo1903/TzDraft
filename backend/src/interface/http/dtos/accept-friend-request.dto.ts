import { IsUUID, IsNotEmpty } from 'class-validator';

export class AcceptFriendRequestDto {
  @IsUUID()
  @IsNotEmpty()
  requesterId: string;
}
