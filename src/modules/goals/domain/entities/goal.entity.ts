import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../../matches/domain/entities/match.entity';
import { Player } from '../../../players/domain/entities/player.entity';
import { User } from '../../../users/domain/entities/user.entity';
import { GoalStatus } from '../enums/goal-status.enum';

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_id' })
  matchId: string;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ name: 'scorer_id' })
  scorerId: string;

  @ManyToOne(() => Player, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'scorer_id' })
  scorer: Player;

  @Column({ name: 'assist_id', nullable: true })
  assistId: string | null;

  @ManyToOne(() => Player, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'assist_id' })
  assist: Player | null;

  @Column({ type: 'smallint', nullable: true })
  minute: number | null;

  // false si se registró solo el autor de un gol ya sumado con el +/− del
  // marcador; al borrarlo no hay que restar nada.
  @Column({ name: 'added_to_score', type: 'boolean', default: true })
  addedToScore: boolean;

  // Solo los aprobados suman al ranking. Un pendiente igual ocupa un gol "sin
  // autor" del marcador.
  @Column({ type: 'enum', enum: GoalStatus, default: GoalStatus.APROBADO })
  status: GoalStatus;

  // Quien lo cargó: a quien se le avisa al aprobarlo o rechazarlo.
  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
