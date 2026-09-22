import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MatchSessionStatus } from '../enums/match-session-status.enum';
import { SessionRotationMode } from '../enums/session-rotation-mode.enum';
import { SessionTeam } from './session-team.entity';

@Entity('match_sessions')
export class MatchSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({
    type: 'enum',
    enum: MatchSessionStatus,
    default: MatchSessionStatus.EN_CURSO,
  })
  status: MatchSessionStatus;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({ name: 'goal_limit', type: 'int', nullable: true })
  goalLimit: number | null;

  @Column({
    name: 'rotation_mode',
    type: 'enum',
    enum: SessionRotationMode,
    default: SessionRotationMode.MANUAL,
  })
  rotationMode: SessionRotationMode;

  @OneToMany(() => SessionTeam, (team) => team.session, { cascade: true })
  teams: SessionTeam[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
