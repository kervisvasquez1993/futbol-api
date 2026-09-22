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

  @OneToMany(() => SessionTeamPlayer, (player) => player.sessionTeam, {
    cascade: true,
  })
  players: SessionTeamPlayer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
