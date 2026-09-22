import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { CreateMatchSessionDto } from '../application/dtos/create-match-session.dto';
import { CreateMatchSessionUseCase } from '../application/use-cases/create-match-session.use-case';
import { FinishMatchSessionUseCase } from '../application/use-cases/finish-match-session.use-case';
import { GetMatchSessionUseCase } from '../application/use-cases/get-match-session.use-case';
import { ListMatchSessionsUseCase } from '../application/use-cases/list-match-sessions.use-case';

@Controller('match-sessions')
export class MatchSessionsController {
  constructor(
    private readonly createMatchSessionUseCase: CreateMatchSessionUseCase,
    private readonly listMatchSessionsUseCase: ListMatchSessionsUseCase,
    private readonly getMatchSessionUseCase: GetMatchSessionUseCase,
    private readonly finishMatchSessionUseCase: FinishMatchSessionUseCase,
  ) {}

  @Get()
  list() {
    return this.listMatchSessionsUseCase.execute();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getMatchSessionUseCase.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateMatchSessionDto) {
    return this.createMatchSessionUseCase.execute(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/finish')
  finish(@Param('id') id: string) {
    return this.finishMatchSessionUseCase.execute(id);
  }
}
