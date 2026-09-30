import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from '../../../players/domain/entities/player.entity';
import { ManualStatStatus } from '../enums/manual-stat-status.enum';
import { MatchSession } from './match-session.entity';

export const MAX_MANUAL_STAT = 50;

// Goles y asistencias que el jugador cargó a mano en una jornada sin rondas.
// La fila existe = "participó", aunque tenga 0 y 0. Solo suma al ranking
// cuando está aprobada por un admin.
@Entity('session_player_stats')
@Unique(['sessionId', 'playerId'])
@Check(`"goals" >= 0 AND "goals" <= ${MAX_MANUAL_STAT}`)
@Check(`"assists" >= 0 AND "assists" <= ${MAX_MANUAL_STAT}`)
export class SessionPlayerStat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => MatchSession, (session) => session.manualStats, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: MatchSession;

  @Column({ name: 'player_id' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ type: 'smallint', default: 0 })
  goals: number;

  @Column({ type: 'smallint', default: 0 })
  assists: number;

  @Column({
    type: 'enum',
    enum: ManualStatStatus,
    default: ManualStatStatus.PENDIENTE,
  })
  status: ManualStatStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
