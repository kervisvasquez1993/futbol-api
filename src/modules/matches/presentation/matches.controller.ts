import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../../shared/decorators/current-user.decorator';
import { AddParticipantDto } from '../application/dtos/add-participant.dto';
import { AdjustMatchScoreDto } from '../application/dtos/adjust-match-score.dto';
import { CreateMatchDto } from '../application/dtos/create-match.dto';
import { JoinMatchDto } from '../application/dtos/join-match.dto';
import { SetMatchResultDto } from '../application/dtos/set-match-result.dto';
import { AddParticipantUseCase } from '../application/use-cases/add-participant.use-case';
import { AdjustMatchScoreUseCase } from '../application/use-cases/adjust-match-score.use-case';
import { CreateMatchUseCase } from '../application/use-cases/create-match.use-case';
import { FinishMatchUseCase } from '../application/use-cases/finish-match.use-case';
import { GetMatchUseCase } from '../application/use-cases/get-match.use-case';
import { JoinMatchUseCase } from '../application/use-cases/join-match.use-case';
import { ListMatchesUseCase } from '../application/use-cases/list-matches.use-case';
import { SetMatchResultUseCase } from '../application/use-cases/set-match-result.use-case';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly createMatchUseCase: CreateMatchUseCase,
    private readonly listMatchesUseCase: ListMatchesUseCase,
    private readonly getMatchUseCase: GetMatchUseCase,
    private readonly finishMatchUseCase: FinishMatchUseCase,
    private readonly addParticipantUseCase: AddParticipantUseCase,
    private readonly joinMatchUseCase: JoinMatchUseCase,
    private readonly setMatchResultUseCase: SetMatchResultUseCase,
    private readonly adjustMatchScoreUseCase: AdjustMatchScoreUseCase,
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/participants')
  addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto) {
    return this.addParticipantUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  join(
    @Param('id') id: string,
    @Body() dto: JoinMatchDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.joinMatchUseCase.execute(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/result')
  setResult(@Param('id') id: string, @Body() dto: SetMatchResultDto) {
    return this.setMatchResultUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/score')
  adjustScore(@Param('id') id: string, @Body() dto: AdjustMatchScoreDto) {
    return this.adjustMatchScoreUseCase.execute(id, dto);
  }
}
