import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum KeyboardType {
  REPLY = 'reply',
  INLINE = 'inline',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  telegramId: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    nullable: true
  })
  role: UserRole;

  @Column({ type: 'date', nullable: true })
  birthday: Date;

  @Column({ type: 'boolean', default: false, nullable: false })
  isVip: boolean;

  @Column({
    type: 'enum',
    enum: KeyboardType,
    default: KeyboardType.REPLY,
    nullable: false
  })
  keyboardType: KeyboardType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
