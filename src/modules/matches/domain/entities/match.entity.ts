import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Player } from '../../../players/domain/entities/player.entity';
import { MatchStatus } from '../enums/match-status.enum';

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

  @ManyToMany(() => Player)
  @JoinTable({
    name: 'match_participants',
    joinColumn: { name: 'match_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'player_id', referencedColumnName: 'id' },
  })
  participants: Player[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
