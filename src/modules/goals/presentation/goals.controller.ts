import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { CreateGoalDto } from '../application/dtos/create-goal.dto';
import { AddGoalUseCase } from '../application/use-cases/add-goal.use-case';
import { DeleteGoalUseCase } from '../application/use-cases/delete-goal.use-case';
import { ListGoalsByMatchUseCase } from '../application/use-cases/list-goals-by-match.use-case';

@Controller()
export class GoalsController {
  constructor(
    private readonly addGoalUseCase: AddGoalUseCase,
    private readonly listGoalsByMatchUseCase: ListGoalsByMatchUseCase,
    private readonly deleteGoalUseCase: DeleteGoalUseCase,
  ) {}

  @Get('matches/:matchId/goals')
  listByMatch(@Param('matchId') matchId: string) {
    return this.listGoalsByMatchUseCase.execute(matchId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('matches/:matchId/goals')
  create(@Param('matchId') matchId: string, @Body() dto: CreateGoalDto) {
    return this.addGoalUseCase.execute(matchId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('goals/:id')
  delete(@Param('id') id: string) {
    return this.deleteGoalUseCase.execute(id);
  }
}
