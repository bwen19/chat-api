import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export abstract class BaseAbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamp' })
  createTime: Date;
}
