import { Controller, Get } from '@nestjs/common';
import { GetLeaderboardUseCase } from '../application/use-cases/get-leaderboard.use-case';

@Controller('stats')
export class StatsController {
  constructor(private readonly getLeaderboardUseCase: GetLeaderboardUseCase) {}

  @Get('leaderboard')
  leaderboard() {
    return this.getLeaderboardUseCase.execute();
  }
}
