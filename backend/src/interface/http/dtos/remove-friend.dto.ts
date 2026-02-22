import { IsUUID, IsNotEmpty } from 'class-validator';

export class RemoveFriendDto {
  @IsUUID()
  @IsNotEmpty()
  friendId: string;
}
