import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Player } from '../../../players/domain/entities/player.entity';
import { UserRole } from '../../../../shared/enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role: UserRole;

  @Column({ name: 'player_id', nullable: true, unique: true })
  playerId: string | null;

  @OneToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'player_id' })
  player: Player | null;

  @Column({ name: 'password_reset_code_hash', type: 'text', nullable: true })
  passwordResetCodeHash: string | null;

  @Column({
    name: 'password_reset_code_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordResetCodeExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
