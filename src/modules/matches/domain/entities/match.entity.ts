import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MatchSession } from '../../../match-sessions/domain/entities/match-session.entity';
import { SessionTeam } from '../../../match-sessions/domain/entities/session-team.entity';
import { MatchStatus } from '../enums/match-status.enum';
import { MatchParticipant } from './match-participant.entity';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.EN_CURSO,
  })
  status: MatchStatus;

  @Column({ name: 'home_team_name', default: 'Equipo A' })
  homeTeamName: string;

  @Column({ name: 'away_team_name', default: 'Equipo B' })
  awayTeamName: string;

  @Column({ name: 'home_score', type: 'int', default: 0 })
  homeScore: number;

  @Column({ name: 'away_score', type: 'int', default: 0 })
  awayScore: number;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({ name: 'goal_limit', type: 'int', nullable: true })
  goalLimit: number | null;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => MatchSession, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: MatchSession | null;

  @Column({ name: 'home_session_team_id', nullable: true })
  homeSessionTeamId: string | null;

  @ManyToOne(() => SessionTeam, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'home_session_team_id' })
  homeSessionTeam: SessionTeam | null;

  @Column({ name: 'away_session_team_id', nullable: true })
  awaySessionTeamId: string | null;

  @ManyToOne(() => SessionTeam, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'away_session_team_id' })
  awaySessionTeam: SessionTeam | null;

  @OneToMany(() => MatchParticipant, (participant) => participant.match, {
    cascade: true,
  })
  participants: MatchParticipant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
