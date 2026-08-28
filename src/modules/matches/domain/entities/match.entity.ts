import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MatchStatus } from '../enums/match-status.enum';
import { MatchParticipant } from './match-participant.entity';

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

  @Column({ name: 'home_team_name', default: 'Equipo A' })
  homeTeamName: string;

  @Column({ name: 'away_team_name', default: 'Equipo B' })
  awayTeamName: string;

  @Column({ name: 'home_score', type: 'int', default: 0 })
  homeScore: number;

  @Column({ name: 'away_score', type: 'int', default: 0 })
  awayScore: number;

  @OneToMany(() => MatchParticipant, (participant) => participant.match, {
    cascade: true,
  })
  participants: MatchParticipant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
