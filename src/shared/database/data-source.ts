import { DataSource, DataSourceOptions } from 'typeorm';
import { envs } from '../../config/envs';
import { User } from '../../modules/users/domain/entities/user.entity';
import { Player } from '../../modules/players/domain/entities/player.entity';
import { Match } from '../../modules/matches/domain/entities/match.entity';
import { MatchParticipant } from '../../modules/matches/domain/entities/match-participant.entity';
import { Goal } from '../../modules/goals/domain/entities/goal.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: envs.dbHost,
  port: envs.dbPort,
  username: envs.dbUser,
  password: envs.dbPassword,
  database: envs.dbName,
  entities: [User, Player, Match, MatchParticipant, Goal],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  synchronize: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);
