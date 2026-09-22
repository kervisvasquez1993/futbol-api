import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { CreateMatchSessionDto, SessionTeamInputDto } from '../application/dtos/create-match-session.dto';
import { CreateSessionRoundDto } from '../application/dtos/create-session-round.dto';
import { AddSessionTeamUseCase } from '../application/use-cases/add-session-team.use-case';
import { CreateMatchSessionUseCase } from '../application/use-cases/create-match-session.use-case';
import { CreateSessionRoundUseCase } from '../application/use-cases/create-session-round.use-case';
import { FinishMatchSessionUseCase } from '../application/use-cases/finish-match-session.use-case';
import { GetMatchSessionUseCase } from '../application/use-cases/get-match-session.use-case';
import { ListMatchSessionsUseCase } from '../application/use-cases/list-match-sessions.use-case';
import { SessionEventStreamService } from '../application/services/session-event-stream.service';

@Controller('match-sessions')
export class MatchSessionsController {
  constructor(
    private readonly createMatchSessionUseCase: CreateMatchSessionUseCase,
    private readonly listMatchSessionsUseCase: ListMatchSessionsUseCase,
    private readonly getMatchSessionUseCase: GetMatchSessionUseCase,
    private readonly finishMatchSessionUseCase: FinishMatchSessionUseCase,
    private readonly addSessionTeamUseCase: AddSessionTeamUseCase,
    private readonly createSessionRoundUseCase: CreateSessionRoundUseCase,
    private readonly sessionEventStreamService: SessionEventStreamService,
  ) {}

  @Get()
  list() {
    return this.listMatchSessionsUseCase.execute();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getMatchSessionUseCase.execute(id);
  }

  @Sse(':id/events')
  events(@Param('id') id: string) {
    return this.sessionEventStreamService.stream(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateMatchSessionDto) {
    return this.createMatchSessionUseCase.execute(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/teams')
  addTeam(@Param('id') id: string, @Body() dto: SessionTeamInputDto) {
    return this.addSessionTeamUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/matches')
  createRound(@Param('id') id: string, @Body() dto: CreateSessionRoundDto) {
    return this.createSessionRoundUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/finish')
  finish(@Param('id') id: string) {
    return this.finishMatchSessionUseCase.execute(id);
  }
}
