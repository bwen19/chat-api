import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@constants';
import { BaseAbstractEntity, RoomEntity } from '.';

@Entity({ name: 'users' })
export class UserEntity extends BaseAbstractEntity {
  @Column({ unique: true })
  username: string;

  @Column()
  nickname: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  userRole: UserRole;

  @Column({ default: '' })
  avatarSrc: string;

  @ManyToMany(() => RoomEntity, (room) => room.members, { cascade: true })
  @JoinTable()
  rooms: RoomEntity[];

  @Column()
  password: string;

  private tempPassword: string;

  @AfterLoad()
  private loadTempPassword(): void {
    this.tempPassword = this.password;
  }

  @BeforeInsert()
  @BeforeUpdate()
  private async encryptPassword(): Promise<void> {
    if (this.tempPassword !== this.password) {
      const salt = await bcrypt.genSalt();
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  public async validatePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
  }
}
