import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './config/envs';
import { dataSourceOptions } from './shared/database/data-source';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlayersModule } from './modules/players/players.module';
import { MatchesModule } from './modules/matches/matches.module';
import { MatchSessionsModule } from './modules/match-sessions/match-sessions.module';
import { GoalsModule } from './modules/goals/goals.module';
import { StatsModule } from './modules/stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions),
    JwtModule.register({
      global: true,
      secret: envs.jwtSecret,
      signOptions: { expiresIn: envs.jwtExpiresIn as any },
    }),
    AuthModule,
    UsersModule,
    PlayersModule,
    MatchesModule,
    MatchSessionsModule,
    GoalsModule,
    StatsModule,
  ],
})
export class AppModule {}
