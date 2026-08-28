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
import { MatchTeamSide } from '../enums/match-team-side.enum';
import { Match } from './match.entity';

@Entity('match_participants')
@Unique(['matchId', 'playerId'])
export class MatchParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_id' })
  matchId: string;

  @ManyToOne(() => Match, (match) => match.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ name: 'player_id' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ type: 'enum', enum: MatchTeamSide })
  team: MatchTeamSide;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
