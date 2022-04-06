import { UserRole } from '@constants';
import { UserEntity } from '@entities';

export class UserVo {
  id: string;
  username: string;
  nickname: string;
  userRole: UserRole;
  avatarSrc: string;
  createTime: Date;

  constructor(user: UserEntity) {
    this.id = user.id;
    this.username = user.username;
    this.nickname = user.nickname;
    this.userRole = user.userRole;
    this.avatarSrc = user.avatarSrc;
    this.createTime = user.createTime;
  }
}

export class AvatarVo {
  avatarSrc: string;

  constructor(path: string) {
    this.avatarSrc = path;
  }
}

export class UserListVo {
  users: UserVo[];
  counts: number;

  constructor(users: UserEntity[], counts: number) {
    this.users = users.map((user) => new UserVo(user));
    this.counts = counts;
  }
}

export class AuthVo {
  user: UserVo;
  accessToken: string;

  constructor(user: UserEntity, accessToken: string) {
    this.user = new UserVo(user);
    this.accessToken = accessToken;
  }
}
