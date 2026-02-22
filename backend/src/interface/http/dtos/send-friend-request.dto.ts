import { IsUUID, IsNotEmpty } from 'class-validator';

export class SendFriendRequestDto {
  @IsUUID()
  @IsNotEmpty()
  friendId: string;
}
