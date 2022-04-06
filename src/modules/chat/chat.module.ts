import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity, RoomEntity } from '@entities';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { FriendModule } from '../friend/friend.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomEntity, MessageEntity]),
    UserModule,
    AuthModule,
    FriendModule,
  ],
  providers: [ChatGateway],
})
export class ChatModule {}
