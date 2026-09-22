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
import { SessionTeam } from './session-team.entity';

@Entity('session_team_players')
@Unique(['sessionTeamId', 'playerId'])
export class SessionTeamPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_team_id' })
  sessionTeamId: string;

  @ManyToOne(() => SessionTeam, (team) => team.players, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_team_id' })
  sessionTeam: SessionTeam;

  @Column({ name: 'player_id' })
  playerId: string;

  @ManyToOne(() => Player, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
