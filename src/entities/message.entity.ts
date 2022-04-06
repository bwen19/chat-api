import { Column, Entity, ManyToOne } from 'typeorm';
import { MessageType } from '@constants';
import { BaseAbstractEntity, UserEntity, RoomEntity } from '.';

@Entity({ name: 'messages' })
export class MessageEntity extends BaseAbstractEntity {
  @Column()
  content: string;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  messageType: MessageType;

  @Column({ nullable: true })
  senderId: string;

  @ManyToOne(() => UserEntity)
  sender: UserEntity;

  @Column({ nullable: true })
  roomId: string;

  @ManyToOne(() => RoomEntity, (room) => room.messages)
  room: RoomEntity;
}
