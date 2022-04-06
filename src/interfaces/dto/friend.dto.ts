import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class FriendBaseDto {
  @IsUUID()
  readonly friendshipId: string;
}

export class RequestFriendDto {
  @IsUUID()
  @IsOptional()
  readonly addresseeId: string;

  @IsUUID()
  @IsOptional()
  readonly roomId: string;
}

export class AcceptFriendDto extends FriendBaseDto {}
export class DeclineFriendDto extends FriendBaseDto {}
export class RemoveFriendDto extends PartialType(FriendBaseDto) {
  @IsUUID()
  @IsOptional()
  readonly roomId: string;
}
