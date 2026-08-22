import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { CreateMatchDto } from '../application/dtos/create-match.dto';
import { CreateMatchUseCase } from '../application/use-cases/create-match.use-case';
import { FinishMatchUseCase } from '../application/use-cases/finish-match.use-case';
import { GetMatchUseCase } from '../application/use-cases/get-match.use-case';
import { ListMatchesUseCase } from '../application/use-cases/list-matches.use-case';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly createMatchUseCase: CreateMatchUseCase,
    private readonly listMatchesUseCase: ListMatchesUseCase,
    private readonly getMatchUseCase: GetMatchUseCase,
    private readonly finishMatchUseCase: FinishMatchUseCase,
  ) {}

  @Get()
  list() {
    return this.listMatchesUseCase.execute();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getMatchUseCase.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateMatchDto) {
    return this.createMatchUseCase.execute(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/finish')
  finish(@Param('id') id: string) {
    return this.finishMatchUseCase.execute(id);
  }
}
