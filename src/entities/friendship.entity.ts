import { Column, Entity } from 'typeorm';
import { FriendStatus } from '@constants';
import { BaseAbstractEntity } from '.';

@Entity({ name: 'friendship' })
export class FriendshipEntity extends BaseAbstractEntity {
  @Column()
  requesterId: string;

  @Column()
  addresseeId: string;

  @Column({ nullable: true })
  roomId: string;

  @Column({ type: 'enum', enum: FriendStatus })
  friendStatus: FriendStatus;
}
