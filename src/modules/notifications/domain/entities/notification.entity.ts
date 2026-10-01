import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MatchSession } from '../../../match-sessions/domain/entities/match-session.entity';
import { Player } from '../../../players/domain/entities/player.entity';
import { User } from '../../../users/domain/entities/user.entity';
import { NotificationType } from '../enums/notification-type.enum';

// Lo que hace falta para pintar el texto sin pedir nada más. Es una foto del
// momento: si después cambia el nombre de la jornada, la notificación no.
export interface NotificationData {
  sessionName?: string;
  playerName?: string;
  goals?: number;
  assists?: number;
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Destinatario.
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  // A dónde lleva la notificación. Si se borra la jornada, se borra con ella.
  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => MatchSession, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session: MatchSession | null;

  // Jugador del que habla la notificación (el de la carga manual).
  @Column({ name: 'player_id', type: 'uuid', nullable: true })
  playerId: string | null;

  @ManyToOne(() => Player, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'player_id' })
  player: Player | null;

  @Column({ type: 'jsonb', default: {} })
  data: NotificationData;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
