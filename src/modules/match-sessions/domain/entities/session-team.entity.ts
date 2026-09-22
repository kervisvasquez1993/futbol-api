import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MatchSession } from './match-session.entity';
import { SessionTeamPlayer } from './session-team-player.entity';

@Entity('session_teams')
@Unique(['sessionId', 'name'])
export class SessionTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => MatchSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: MatchSession;

  @Column()
  name: string;

  // Orden estable de alta del equipo en la jornada (0, 1, 2, ...), independiente
  // de la cola de rotación — sirve para no depender del orden en que Postgres
  // devuelve la relación `teams` al reconstruir la jornada 1:1.
  @Column({ name: 'join_order', type: 'int', default: 0 })
  joinOrder: number;

  // Solo tiene sentido en rotationMode = 'winner_stays': null = el equipo está
  // jugando la ronda actual (o la jornada es 'manual'); un número = su posición
  // en la fila de espera (0 = el próximo en entrar).
  @Column({ name: 'queue_position', type: 'int', nullable: true })
  queuePosition: number | null;

  @OneToMany(() => SessionTeamPlayer, (player) => player.sessionTeam, {
    cascade: true,
  })
  players: SessionTeamPlayer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
