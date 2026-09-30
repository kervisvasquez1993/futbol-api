import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MatchSessionStatus } from '../enums/match-session-status.enum';
import { SessionRotationMode } from '../enums/session-rotation-mode.enum';
import { SessionAttendee } from './session-attendee.entity';
import { SessionPlayerStat } from './session-player-stat.entity';
import { SessionTeam } from './session-team.entity';

export const MAX_PLAYERS_PER_TEAM = 20;

@Entity('match_sessions')
@Check(
  `"players_per_team" IS NULL OR ("players_per_team" >= 1 AND "players_per_team" <= ${MAX_PLAYERS_PER_TEAM})`,
)
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

  // Tamaño de equipo de la jornada: con cuánto se completa al equipo que entra
  // (refuerzos). null en jornadas viejas = el equipo con más jugadores.
  @Column({ name: 'players_per_team', type: 'smallint', nullable: true })
  playersPerTeam: number | null;

  @Column({
    name: 'rotation_mode',
    type: 'enum',
    enum: SessionRotationMode,
    default: SessionRotationMode.MANUAL,
  })
  rotationMode: SessionRotationMode;

  @OneToMany(() => SessionTeam, (team) => team.session, { cascade: true })
  teams: SessionTeam[];

  @OneToMany(() => SessionAttendee, (attendee) => attendee.session)
  attendees: SessionAttendee[];

  @OneToMany(() => SessionPlayerStat, (stat) => stat.session)
  manualStats: SessionPlayerStat[];

  // No es columna: lo calcula el repositorio (true si la jornada no tiene
  // rondas) para que el front no tenga que deducir la regla.
  allowsManualStats: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
