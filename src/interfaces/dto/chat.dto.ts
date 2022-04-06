import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { MessageType } from '@constants';

// For messages
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  readonly content: string;

  @IsEnum(MessageType)
  @IsOptional()
  readonly messageType: MessageType;

  @IsUUID()
  @IsNotEmpty()
  readonly roomId: string;
}

export class RemoveMessageDto {
  @IsUUID()
  @IsNotEmpty()
  readonly messageId: string;
}

// For rooms
export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(2)
  readonly memberIds: string[];
}

export class RemoveRoomDto {
  @IsUUID()
  readonly roomId: string;
}

export class AddRoomMembersDto {
  @IsUUID()
  readonly roomId: string;

  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  readonly memberIds: string[];
}

export class DeleteRoomMembersDto extends AddRoomMembersDto {}

export class LeaveRoomDto extends RemoveRoomDto {}

export class UpdateRoomNameDto {
  @IsUUID()
  readonly roomId: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;
}

export class UpdateRoomNoticeDto {
  @IsUUID()
  readonly roomId: string;

  @IsString()
  @IsNotEmpty()
  readonly notice: string;
}
