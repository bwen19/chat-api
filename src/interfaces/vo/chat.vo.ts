import { MessageType, RoomType } from '@constants';
import { MessageEntity, RoomEntity, UserEntity } from '@entities';
import { UserVo } from '.';

export class MessageVo {
  id: string;
  sender: UserVo;
  content: string;
  messageType: MessageType;
  sendTime: Date;

  constructor(message: MessageEntity) {
    this.id = message.id;
    this.sender = new UserVo(message.sender);
    this.content = message.content;
    this.messageType = message.messageType;
    this.sendTime = message.createTime;
  }
}

export class RoomVo {
  id: string;
  createTime: Date;
  name: string;
  members: UserVo[];
  messages: MessageVo[];
  roomType: RoomType;
  avatarSrc?: string;
  ownerId?: string;
  notice?: string;

  constructor(room: RoomEntity, friend?: UserEntity | UserVo) {
    this.id = room.id;
    this.createTime = room.createTime;
    this.members = room.members.map((member) => new UserVo(member));
    this.messages = (room.messages && room.messages.map((message) => new MessageVo(message))) || [];
    this.roomType = room.roomType;
    this.ownerId = room.ownerId;
    this.notice = room.notice;
    if (this.roomType === RoomType.FRIEND && !!friend) {
      this.name = friend.nickname;
      this.avatarSrc = friend.avatarSrc;
    } else {
      this.name = room.name;
    }
  }
}

export class RoomsAddMessageVo {
  ev = 'addMessage';
  roomId: string;
  message: MessageVo;

  constructor(message: MessageEntity) {
    this.roomId = message.roomId;
    this.message = new MessageVo(message);
  }
}

export class RoomsRemoveMessageVo {
  ev = 'removeMessage';
  roomId: string;
  messageId: string;

  constructor(message: MessageEntity) {
    this.roomId = message.roomId;
    this.messageId = message.id;
  }
}

export class RoomsAddRoomVo {
  ev = 'addRoom';
  room: RoomVo;

  constructor(room: RoomEntity, friend?: UserEntity | UserVo) {
    this.room = new RoomVo(room, friend);
  }
}

export class RoomsRemoveRoomVo {
  ev = 'removeRoom';
  roomId: string;

  constructor(roomId: string) {
    this.roomId = roomId;
  }
}

export class RoomsAddMembersVo {
  ev = 'addMembers';
  roomId: string;
  members: UserVo[];

  constructor(roomId: string, users: UserVo[] | UserEntity[]) {
    this.roomId = roomId;
    this.members = users.map((user: UserVo | UserEntity) =>
      user instanceof UserVo ? user : new UserVo(user),
    );
  }
}

export class RoomsRemoveMembersVo {
  ev = 'removeMembers';
  roomId: string;
  memberIds: string[];

  constructor(roomId: string, userIds: string[]) {
    this.roomId = roomId;
    this.memberIds = userIds;
  }
}

export class RoomsUpdateNameVo {
  ev = 'updateName';
  roomId: string;
  name: string;

  constructor(roomId: string, name: string) {
    this.roomId = roomId;
    this.name = name;
  }
}

export class RoomsUpdateNoticeVo {
  ev = 'updateNotice';
  roomId: string;
  notice: string;

  constructor(roomId: string, notice: string) {
    this.roomId = roomId;
    this.notice = notice;
  }
}
