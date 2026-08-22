import { Module } from '@nestjs/common';
import { GetLeaderboardUseCase } from './application/use-cases/get-leaderboard.use-case';
import { StatsController } from './presentation/stats.controller';

@Module({
  controllers: [StatsController],
  providers: [GetLeaderboardUseCase],
})
export class StatsModule {}
