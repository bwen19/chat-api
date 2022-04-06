import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindConditions, Repository } from 'typeorm';
import { RoomEntity, UserEntity } from '@entities';
import {
  CreateUserDto,
  SearchUserDto,
  UpdatePasswordDto,
  UserListDto,
  UpdateUserDto,
} from '@interfaces/dto';
import { UserVo, UserListVo, AvatarVo } from '@interfaces/vo';
import { CUSTOM_AVATAR_PATH, RoomType, STATIC_ROOT } from '@constants';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getUser(options: FindConditions<UserEntity>): Promise<UserEntity> {
    return this.userRepository.findOneOrFail(options);
  }

  async getUsersByIds(userIds: string[]): Promise<UserEntity[]> {
    const users = await this.userRepository.findByIds(userIds);
    if (users.length !== userIds.length) {
      throw new NotFoundException('找不到指定的一组用户');
    }
    return users;
  }

  async getUserList(userListDto: UserListDto): Promise<UserListVo> {
    const [users, counts] = await this.userRepository.findAndCount({
      skip: userListDto.skip,
      take: userListDto.pageSize,
    });
    return new UserListVo(users, counts);
  }

  async createUser(createUserDto: CreateUserDto): Promise<UserVo> {
    if (await this.userRepository.findOne({ username: createUserDto.username })) {
      throw new BadRequestException('该用户已经存在');
    }

    const userSingleRoom = new RoomEntity();
    userSingleRoom.name = '文件传输助手';
    userSingleRoom.roomType = RoomType.SINGLE;

    const defaultUser = this.userRepository.create({
      rooms: [userSingleRoom],
      password: '123456',
      nickname: createUserDto.username,
      avatarSrc: './assets/avatar/default/avatar-0.png',
    });
    const newUser = this.userRepository.merge(defaultUser, createUserDto);

    const user = await this.userRepository.save(newUser);
    return new UserVo(user);
  }

  async deleteUser(userId: string): Promise<UserVo> {
    const deleteUser = await this.userRepository.findOne({ id: userId });
    // Leave all rooms
    deleteUser.rooms = [];
    const leaveRoomUser = await this.userRepository.save(deleteUser);
    const user = await this.userRepository.remove(leaveRoomUser);
    return new UserVo(user);
  }

  async updatePassword(user: UserEntity, updatePasswordDto: UpdatePasswordDto): Promise<UserVo> {
    const { oldPassword, password, passwordRepeat } = updatePasswordDto;
    if (!(await user.validatePassword(oldPassword))) {
      throw new BadRequestException('密码错误, 无法更改密码');
    }
    if (password !== passwordRepeat) {
      throw new BadRequestException('两次输入密码不一致, 请确认');
    }
    if (oldPassword === password) {
      throw new BadRequestException('新密码与旧密码一致, 无需更新');
    }

    user.password = password;
    const updateUser = await this.userRepository.save(user);
    return new UserVo(updateUser);
  }

  async updateUser(param: string | UserEntity, updateUserDto: UpdateUserDto): Promise<UserVo> {
    let user: UserEntity;
    if (typeof param === 'string') {
      user = await this.getUser({ id: param });
    } else {
      user = param;
    }
    const mergeUser = this.userRepository.merge(user, updateUserDto);
    const updateUser = await this.userRepository.save(mergeUser);
    return new UserVo(updateUser);
  }

  async uploadAvatar(file: Express.Multer.File): Promise<AvatarVo> {
    const path = join(process.cwd(), `${STATIC_ROOT}/${CUSTOM_AVATAR_PATH}`);
    const items = file.filename.split('-')[1];
    if (items.length === 3) {
      const username = items[1];
      fs.readdir(path, (err, files) => {
        if (err) throw err;
        files.forEach((fname) => {
          const elems = fname.split('-');
          if (elems.length === 3 && elems[0] === file.fieldname && elems[1] === username) {
            const pfile = `${path}/${fname}`;
            fs.stat(pfile, (err, stats) => {
              if (err) throw err;
              if (!stats.isDirectory() && fname !== file.filename) {
                fs.unlink(pfile, (err) => {
                  if (err) throw err;
                });
              }
            });
          }
        });
      });
    }
    const avatarSrc = `${CUSTOM_AVATAR_PATH}/${file.filename}`;
    return new AvatarVo(avatarSrc);
  }

  async getUserJoinedRooms(userId: string): Promise<UserEntity> {
    return this.userRepository.findOneOrFail(userId, { relations: ['rooms', 'rooms.members'] });
  }

  async searchUser(searchUserDto: SearchUserDto): Promise<UserVo> {
    const user = await this.userRepository.findOne(searchUserDto);
    return user && new UserVo(user) || undefined;
  }
}
