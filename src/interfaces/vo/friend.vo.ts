import { FriendStatus } from '@constants';
import { FriendshipEntity, UserEntity } from '@entities';
import { UserVo } from '.';

export class FriendVo {
  id: string;
  user: UserVo;
  friendStatus: FriendStatus;
  createTime: Date;
  roomId?: string;
  isRequester?: boolean;

  constructor(friendship: FriendshipEntity, friend: UserEntity | UserVo) {
    this.id = friendship.id;
    this.user = friend instanceof UserEntity ? new UserVo(friend) : friend;
    this.friendStatus = friendship.friendStatus;
    this.createTime = friendship.createTime;
    this.roomId = friendship.roomId;
    if (this.friendStatus === FriendStatus.REQUESTED) {
      this.isRequester = friendship.requesterId === friend.id;
    }
  }
}

export class FriendsAddFriendVo {
  ev = 'addFriend';
  friend: FriendVo;

  constructor(friendship: FriendshipEntity, friend: UserEntity | UserVo) {
    this.friend = new FriendVo(friendship, friend);
  }
}

export class FriendsUpdateFriendVo {
  ev = 'updateFriend';
  friendshipId: string;
  friendStatus: FriendStatus;
  roomId?: string;

  constructor(friendship: FriendshipEntity) {
    this.friendshipId = friendship.id;
    this.friendStatus = friendship.friendStatus;
    if (friendship.roomId) {
      this.roomId = friendship.roomId;
    }
  }
}

export class FriendsRemoveFriendVo {
  ev = 'removeFriend';
  friendshipId: string;

  constructor(friendshipId: string) {
    this.friendshipId = friendshipId;
  }
}

export class FriendListVo {
  friends: FriendshipEntity[];
  counts: number;
}
