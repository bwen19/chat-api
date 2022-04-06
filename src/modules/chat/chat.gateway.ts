import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CustomExceptionFilter } from '@common/filters';

import { FriendStatus, RoomType } from '@constants';
import { MessageEntity, RoomEntity, UserEntity } from '@entities';
import {
  SendMessageDto,
  RemoveMessageDto,
  RequestFriendDto,
  AcceptFriendDto,
  DeclineFriendDto,
  RemoveFriendDto,
  CreateRoomDto,
  RemoveRoomDto,
  LeaveRoomDto,
  AddRoomMembersDto,
  DeleteRoomMembersDto,
  UpdateRoomNameDto,
  UpdateRoomNoticeDto,
} from '@interfaces/dto';
import {
  RoomVo,
  RoomsAddMessageVo,
  RoomsAddRoomVo,
  RoomsAddMembersVo,
  RoomsRemoveRoomVo,
  RoomsRemoveMessageVo,
  RoomsRemoveMembersVo,
  RoomsUpdateNameVo,
  RoomsUpdateNoticeVo,
  FriendsAddFriendVo,
  FriendsUpdateFriendVo,
  FriendsRemoveFriendVo,
} from '@interfaces/vo';
import { FriendService } from '@modules/friend/friend.service';
import { UserService } from '@modules/user/user.service';
import { AuthService } from '@modules/auth/auth.service';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseFilters(new CustomExceptionFilter())
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'events',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private userSockets = new Map<string, string>(); // Map userId to socketId

  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomRepository: Repository<RoomEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly friendService: FriendService,
  ) {}

  @WebSocketServer()
  server: Server;

  private async getSocket(userId: string) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const sockets = await this.server.to(socketId).fetchSockets();
      return sockets[0];
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      // Verify token
      const token = client.handshake.auth['token'].split(' ')[1];
      const { id, username } = await this.authService.verifyToken(token);
      // Check current user
      const { id: userId, nickname } = await this.userService.getUser({ id, username });
      // Update client socket, each user can only have one alive socket
      client.handshake.auth.currUserId = userId;

      console.log(`Client connected: ${client.id} ${nickname}`);
    } catch (err) {
      console.error(`Connection failed: ${client.id}, Reason: ${err.message}`);
      client.disconnect(true);
    }

    if (client.connected) {
      const userId = client.handshake.auth.currUserId as string;
      // Remove previous connected socket
      const oldSocket = await this.getSocket(userId);
      if (oldSocket) {
        oldSocket.emit('unauthorized', '您的账号已在其他地方登录');
        oldSocket.disconnect(true);
      }
      this.userSockets.set(userId, client.id);
      // Get all user's rooms
      const { rooms: userRooms } = await this.userService.getUserJoinedRooms(userId);
      const roomsVo = await Promise.all(
        userRooms.map(async (room) => {
          // socket join each room
          client.join(room.id);
          // Get recent messages for each room
          const messages = await this.messageRepository.find({
            relations: ['sender'],
            where: { roomId: room.id },
            order: { createTime: 'DESC' },
            take: 30,
          });
          room.messages = messages.reverse();
          // Construct RoomVo
          if (room.roomType === RoomType.FRIEND && room.members.length === 2) {
            const friend = room.members.find((member) => member.id !== userId);
            return new RoomVo(room, friend);
          } else {
            return new RoomVo(room);
          }
        }),
      );
      client.emit('initRooms', roomsVo);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.handshake.auth.currUserId as string;
    this.userSockets.delete(userId);
    console.log(`Client disconnected: ${client.id}`);
  }

  // --------------------------------------------------------------------------
  // Handle messages
  // --------------------------------------------------------------------------
  @SubscribeMessage('sendMessage')
  async onSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() param: SendMessageDto,
  ): Promise<void> {
    const senderId = client.handshake.auth.currUserId as string;
    const newMessage = this.messageRepository.create(param);
    newMessage.senderId = senderId;
    const message = await this.messageRepository.save(newMessage);
    message.sender = await this.userService.getUser({ id: senderId });
    const ret = new RoomsAddMessageVo(message);
    this.server.to(ret.roomId).emit('room', ret);
  }

  @SubscribeMessage('removeMessage')
  async onRemoveMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() param: RemoveMessageDto,
  ): Promise<void> {
    const senderId = client.handshake.auth.currUserId as string;
    const message = await this.messageRepository.findOne(param.messageId, { where: { senderId } });
    if (!message) {
      throw new WsException('该消息不存在');
    }
    const ret = new RoomsRemoveMessageVo(message);
    this.server.to(ret.roomId).emit('room', ret);
  }

  // --------------------------------------------------------------------------
  // Handle friends
  // --------------------------------------------------------------------------
  @SubscribeMessage('requestFriend')
  async onRequestFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody() param: RequestFriendDto,
  ): Promise<void> {
    const requesterId = client.handshake.auth.currUserId as string;
    const friendship = await this.friendService.requestFriend(requesterId, param);
    const { addresseeId } = friendship;

    const socket = await this.getSocket(addresseeId);
    if (socket) {
      // event to addressee
      const requester = await this.userService.getUser({ id: requesterId });
      socket.emit('friend', new FriendsAddFriendVo(friendship, requester));
    }
    // event to requester
    const addressee = await this.userService.getUser({ id: addresseeId });
    client.emit('friend', new FriendsAddFriendVo(friendship, addressee));
    client.emit('msgToClient', { status: 'success', message: '请求已经发出' });
  }

  @SubscribeMessage('acceptFriend')
  async onAcceptFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody() param: AcceptFriendDto,
  ): Promise<void> {
    const addresseeId = client.handshake.auth.currUserId as string;
    const friendship = await this.friendService.getFriendship(param.friendshipId);
    const { requesterId, roomId } = friendship;
    const newMembers = await this.userService.getUsersByIds([requesterId, addresseeId]);
    if (newMembers.length !== 2) {
      throw new WsException('用户已经不存在');
    }

    let room: RoomEntity = new RoomEntity();
    let leftMemberId: string = '';
    if (roomId) {
      // Old friend's room exists
      const oldRoom = await this.roomRepository.findOne(roomId, { relations: ['members'] });
      if (oldRoom) {
        if (oldRoom.members.length === 1) {
          room = oldRoom;
          leftMemberId = oldRoom.members[0].id;
        } else {
          oldRoom.members = [];
          await this.messageRepository.delete({ roomId: oldRoom.id });
          const toRemoveRoom = await this.roomRepository.save(oldRoom);
          await this.roomRepository.remove(toRemoveRoom);
        }
      }
    }

    room.name = '好友房间';
    room.members = newMembers;
    room.roomType = RoomType.FRIEND;
    const newRoom = await this.roomRepository.save(room);

    friendship.roomId = newRoom.id;
    friendship.friendStatus = FriendStatus.ACCEPTED;
    const newFriendship = await this.friendService.updateFriendship(friendship);

    // event to requester
    const socket = await this.getSocket(requesterId);
    if (socket) {
      socket.join(newRoom.id);
      const addressee = newMembers.find((member) => member.id === addresseeId);
      if (leftMemberId && leftMemberId !== addresseeId) {
        socket.emit('room', new RoomsAddMembersVo(room.id, [addressee]));
      } else {
        socket.emit('room', new RoomsAddRoomVo(room, addressee));
      }
    }

    // event to addressee
    client.join(newRoom.id);
    const requester = newMembers.find((member) => member.id === requesterId);
    if (leftMemberId === addresseeId) {
      client.emit('room', new RoomsAddMembersVo(room.id, [requester]));
    } else {
      client.emit('room', new RoomsAddRoomVo(room, requester));
    }

    // Update friendstatus from request to accepted
    this.server.to(newRoom.id).emit('friend', new FriendsUpdateFriendVo(newFriendship));
    this.server.to(newRoom.id).emit('msgToClient', { status: 'success', message: '添加好友成功' });
  }

  @SubscribeMessage('declineFriend')
  async onDeclineFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody() param: DeclineFriendDto,
  ): Promise<void> {
    const friendship = await this.friendService.getFriendship(param.friendshipId);
    if (friendship.friendStatus !== FriendStatus.REQUESTED) {
      throw new WsException('当前好友状态不支持此方法');
    }
    friendship.friendStatus = FriendStatus.DECLINED;
    const { id, requesterId } = await this.friendService.updateFriendship(friendship);

    const removeFriendVo = new FriendsRemoveFriendVo(id);
    const socket = await this.getSocket(requesterId);
    if (socket) {
      socket.emit('friend', removeFriendVo);
      socket.emit('msgToClient', { status: 'warning', message: '好友申请被拒' });
    }
    client.emit('friend', removeFriendVo);
  }

  @SubscribeMessage('removeFriend')
  async onRemoveFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody() param: RemoveFriendDto,
  ): Promise<void> {
    const currUserId = client.handshake.auth.currUserId as string;
    let condition = {};
    if (param.friendshipId) {
      Object.assign(condition, { id: param.friendshipId });
    } else if (param.roomId) {
      Object.assign(condition, { roomId: param.roomId });
    } else {
      throw new WsException('删除好友参数错误');
    }

    const options = {
      where: [
        Object.assign({}, condition, { requesterId: currUserId }),
        Object.assign({}, condition, { addresseeId: currUserId }),
      ],
    };
    const friendship = await this.friendService.getFriendship(options);
    const { id, roomId } = friendship;

    if (friendship.friendStatus === FriendStatus.ACCEPTED) {
      friendship.friendStatus = FriendStatus.DECLINED;
      await this.friendService.updateFriendship(friendship);
      this.server.to(roomId).emit('friend', new FriendsRemoveFriendVo(id));
      // Leave friend room
      client.emit('room', new RoomsRemoveRoomVo(roomId));
      client.leave(roomId);

      const room = await this.roomRepository.findOneOrFail(roomId, {
        relations: ['members'],
      });
      const index = room.members.findIndex((member) => member.id === currUserId);
      if (index > -1) {
        const deleteMembers = room.members.splice(index, 1);
        room.name = deleteMembers[0].nickname;
      }
      await this.roomRepository.save(room);
      this.server.to(roomId).emit('room', new RoomsRemoveMembersVo(roomId, [currUserId]));
      this.server.to(roomId).emit('msgToClient', { status: 'warning', message: '好友被删除' });
    } else if (friendship.friendStatus === FriendStatus.DECLINED) {
      await this.messageRepository.delete({ roomId });
      const room = await this.roomRepository.findOne(roomId);
      room.members = [];
      const newRoom = await this.roomRepository.save(room);
      await this.roomRepository.remove(newRoom);
      await this.friendService.removeFriendship(friendship);
      this.server.to(roomId).emit('room', new RoomsRemoveRoomVo(roomId));
      this.server.socketsLeave(roomId);
    } else {
      throw new WsException('当前好友状态不支持此方法');
    }
  }

  // --------------------------------------------------------------------------
  // Handle rooms
  // --------------------------------------------------------------------------
  @SubscribeMessage('createRoom')
  async onCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() createRoomDto: CreateRoomDto,
  ): Promise<void> {
    const ownerId = client.handshake.auth.currUserId as string;
    createRoomDto.memberIds.push(ownerId);
    // Check whether members exist
    const users = await this.userService.getUsersByIds(createRoomDto.memberIds);
    if (users.length < 3) {
      throw new WsException('群组中有用户不存在, 总数不能小于3');
    }
    const newRoom = new RoomEntity();
    newRoom.name = createRoomDto.name;
    newRoom.ownerId = ownerId;
    newRoom.members = users;
    newRoom.messages = [];
    newRoom.roomType = RoomType.PUBLIC;
    const room = await this.roomRepository.save(newRoom);

    const roomsAddRoomVo = new RoomsAddRoomVo(room);
    for (let member of room.members) {
      const socket = await this.getSocket(member.id);
      if (socket) {
        socket.join(roomsAddRoomVo.room.id);
        socket.emit('room', roomsAddRoomVo);
        socket.emit('msgToClient', { status: 'info', message: `您已加入新房间(${room.name})` });
      }
    }
  }

  @SubscribeMessage('removeRoom')
  async onRemoveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() removeRoomDto: RemoveRoomDto,
  ): Promise<void> {
    const ownerId = client.handshake.auth.currUserId as string;
    const { roomId } = removeRoomDto;
    const roomToRemove = await this.roomRepository.findOneOrFail(roomId, {
      where: { ownerId },
    });
    await this.messageRepository.delete({ roomId });
    await this.roomRepository.remove(roomToRemove);
    const roomsRemoveRoomVo = new RoomsRemoveRoomVo(roomId);
    this.server.to(roomId).emit('room', roomsRemoveRoomVo);
    this.server
      .to(roomId)
      .emit('msgToClient', { status: 'warning', message: `房间(${roomToRemove.name})被群主解散` });
    this.server.socketsLeave(roomId);
  }

  @SubscribeMessage('addRoomMembers')
  async onAddRoomMembers(@MessageBody() addRoomMembersDto: AddRoomMembersDto): Promise<void> {
    const room = await this.roomRepository.findOneOrFail(addRoomMembersDto.roomId, {
      relations: ['members'],
    });
    let newMembers: UserEntity[] = [];
    const newUsers = await this.userService.getUsersByIds(addRoomMembersDto.memberIds);
    newUsers.forEach((user) => {
      const hasUser = room.members.find((member) => member.id === user.id);
      if (!hasUser) {
        room.members.push(user);
        newMembers.push(user);
      }
    });
    const newRoom = await this.roomRepository.save(room);

    const roomsAddRoomVo = new RoomsAddRoomVo(newRoom);
    const roomsAddMembersVo = new RoomsAddMembersVo(newRoom.id, newMembers);
    for (let member of newRoom.members) {
      const socket = await this.getSocket(member.id);
      if (socket) {
        if (newMembers.find((newMember) => newMember.id === member.id)) {
          socket.join(newRoom.id);
          socket.emit('room', roomsAddRoomVo);
          socket.emit('msgToClient', {
            status: 'info',
            message: `您已加入新房间(${newRoom.name})`,
          });
        } else {
          socket.emit('room', roomsAddMembersVo);
        }
      }
    }
  }

  @SubscribeMessage('deleteRoomMembers')
  async onDeleteRoomMembers(
    @ConnectedSocket() client: Socket,
    @MessageBody() deleteRoomMembersDto: DeleteRoomMembersDto,
  ): Promise<void> {
    const ownerId = client.handshake.auth.currUserId as string;
    const { roomId, memberIds } = deleteRoomMembersDto;
    const room = await this.roomRepository.findOneOrFail(roomId, {
      where: { ownerId },
      relations: ['members'],
    });
    if (memberIds.includes(ownerId)) {
      throw new WsException('无法从房间移除自己');
    }
    const totalMembers = room.members;
    const newMembers = totalMembers.filter((member) => !memberIds.includes(member.id));
    room.members = newMembers;
    const newRoom = await this.roomRepository.save(room);

    const roomsRemoveRoomVo = new RoomsRemoveRoomVo(roomId);
    const roomsRemoveMembersVo = new RoomsRemoveMembersVo(roomId, memberIds);
    for (let member of totalMembers) {
      const socket = await this.getSocket(member.id);
      if (socket) {
        if (memberIds.includes(member.id)) {
          socket.leave(roomId);
          socket.emit('room', roomsRemoveRoomVo);
          socket.emit('msgToClient', {
            status: 'warning',
            message: `您已被移出房间(${newRoom.name})`,
          });
        } else {
          socket.emit('room', roomsRemoveMembersVo);
        }
      }
    }
  }

  @SubscribeMessage('leaveRoom')
  async onLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() leaveRoomDto: LeaveRoomDto,
  ): Promise<void> {
    const userId = client.handshake.auth.currUserId as string;
    const room = await this.roomRepository.findOneOrFail(leaveRoomDto.roomId, {
      relations: ['members'],
    });
    if (room.roomType === RoomType.SINGLE || room.roomType === RoomType.FRIEND) {
      throw new WsException('该房间不支持此方法');
    }

    const newMembers = room.members.filter((member) => member.id !== userId);
    room.members = newMembers;
    const newRoom = await this.roomRepository.save(room);
    if (newMembers.length === 0) {
      await this.messageRepository.delete({ roomId: room.id });
      await this.roomRepository.remove(newRoom);
    }
    client.emit('room', new RoomsRemoveRoomVo(room.id));
    client.leave(room.id);
    if (room.members.length > 0) {
      this.server.to(room.id).emit('room', new RoomsRemoveMembersVo(room.id, [userId]));
    }
  }

  @SubscribeMessage('updateRoomName')
  async onUpdateRoomName(
    @ConnectedSocket() client: Socket,
    @MessageBody() updateRoomNameDto: UpdateRoomNameDto,
  ): Promise<void> {
    const userId = client.handshake.auth.currUserId as string;
    const { roomId, name } = updateRoomNameDto;
    const room = await this.roomRepository.findOneOrFail(roomId, {
      where: { ownerId: userId },
    });
    room.name = name;
    await this.roomRepository.save(room);
    this.server.to(room.id).emit('room', new RoomsUpdateNameVo(roomId, name));
  }

  @SubscribeMessage('updateRoomNotice')
  async onUpdateRoomNotice(
    @ConnectedSocket() client: Socket,
    @MessageBody() updateRoomNoticeDto: UpdateRoomNoticeDto,
  ): Promise<void> {
    const userId = client.handshake.auth.currUserId as string;
    const { roomId, notice } = updateRoomNoticeDto;
    const room = await this.roomRepository.findOneOrFail(roomId, {
      where: { ownerId: userId },
    });
    room.notice = notice;
    await this.roomRepository.save(room);
    this.server.to(room.id).emit('room', new RoomsUpdateNoticeVo(roomId, notice));
  }
}
