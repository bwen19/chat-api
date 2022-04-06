import { Entity, Column, ManyToMany, OneToMany } from 'typeorm';
import { RoomType } from '@constants';
import { BaseAbstractEntity, UserEntity, MessageEntity } from '.';

@Entity({ name: 'rooms' })
export class RoomEntity extends BaseAbstractEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ default: '目前没有公告' })
  notice: string;

  @ManyToMany(() => UserEntity, (user) => user.rooms)
  members: UserEntity[];

  @OneToMany(() => MessageEntity, (message) => message.room)
  messages: MessageEntity[];

  @Column({ type: 'enum', enum: RoomType })
  roomType: RoomType;
}
