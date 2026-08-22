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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
