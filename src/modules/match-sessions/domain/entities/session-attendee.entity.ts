import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Player } from '../../../players/domain/entities/player.entity';
import { MatchSession } from './match-session.entity';

// Jugador que confirmó que va a la jornada (o invitado que sumó el admin).
@Entity('session_attendees')
@Unique(['sessionId', 'playerId'])
export class SessionAttendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => MatchSession, (session) => session.attendees, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: MatchSession;

  @Column({ name: 'player_id' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
