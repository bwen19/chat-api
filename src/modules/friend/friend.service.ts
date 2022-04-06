import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WsException } from '@nestjs/websockets';
import { FindConditions, FindOneOptions, Not, Repository } from 'typeorm';
import { FriendStatus } from '@constants';
import { UserEntity, FriendshipEntity } from '@entities';
import { RequestFriendDto } from '@interfaces/dto';
import { FriendVo } from '@interfaces/vo';
import { UserService } from '../user/user.service';

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(FriendshipEntity)
    private readonly friendshipRepository: Repository<FriendshipEntity>,
    private readonly userService: UserService,
  ) {}

  async getFriendship(param: string): Promise<FriendshipEntity>;
  async getFriendship(param: FindOneOptions<FriendshipEntity>): Promise<FriendshipEntity>;
  async getFriendship(param: FindConditions<FriendshipEntity>): Promise<FriendshipEntity>;
  async getFriendship(param: unknown): Promise<FriendshipEntity> {
    const friendship = await this.friendshipRepository.findOne(param);
    if (!friendship) {
      throw new BadRequestException('朋友关系不存在');
    }
    return friendship;
  }

  async getFriends(user: UserEntity): Promise<FriendVo[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: user.id, friendStatus: Not(FriendStatus.DECLINED) },
        { addresseeId: user.id, friendStatus: Not(FriendStatus.DECLINED) },
      ],
    });

    return Promise.all(
      friendships.map(async (friendship) => {
        let friendId: string;
        if (user.id === friendship.requesterId) {
          friendId = friendship.addresseeId;
        } else {
          friendId = friendship.requesterId;
        }
        const friend = await this.userService.getUser({ id: friendId });
        return new FriendVo(friendship, friend);
      }),
    );
  }

  async requestFriend(requesterId: string, param: RequestFriendDto): Promise<FriendshipEntity> {
    let friendship: FriendshipEntity;
    let addresseeId: string;

    if ('roomId' in param) {
      const { roomId } = param;
      friendship = await this.friendshipRepository.findOne({
        where: [
          { roomId, requesterId },
          { roomId, addresseeId: requesterId },
        ],
      });
      if (!friendship) {
        throw new WsException('好友关系不存在');
      } else if (friendship.requesterId === requesterId) {
        addresseeId = friendship.addresseeId;
      } else {
        addresseeId = friendship.requesterId;
      }
    } else if ('addresseeId' in param) {
      addresseeId = param.addresseeId;
      friendship = await this.friendshipRepository.findOne({
        where: [
          { requesterId: requesterId, addresseeId: addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      });
    } else {
      throw new WsException('请求好友参数不正确');
    }
    if (friendship && friendship.friendStatus !== FriendStatus.DECLINED) {
      throw new WsException('好友关系已存在或等待确认');
    }

    const newFriendship = friendship ? friendship : new FriendshipEntity();
    newFriendship.requesterId = requesterId;
    newFriendship.addresseeId = addresseeId;
    newFriendship.friendStatus = FriendStatus.REQUESTED;
    return this.friendshipRepository.save(newFriendship);
  }

  async updateFriendship(friendEntity: FriendshipEntity): Promise<FriendshipEntity> {
    return this.friendshipRepository.save(friendEntity);
  }

  async removeFriendship(friendEntity: FriendshipEntity): Promise<FriendshipEntity> {
    return this.friendshipRepository.remove(friendEntity);
  }
}
