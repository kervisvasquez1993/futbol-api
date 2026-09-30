import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../../shared/decorators/current-user.decorator';
import { AddSessionGuestDto } from '../application/dtos/add-session-guest.dto';
import {
  CreateMatchSessionDto,
  SessionTeamInputDto,
} from '../application/dtos/create-match-session.dto';
import { CreateSessionRoundDto } from '../application/dtos/create-session-round.dto';
import { StartMatchSessionDto } from '../application/dtos/start-match-session.dto';
import { UpdateSessionTeamsDto } from '../application/dtos/update-session-teams.dto';
import { AddSessionGuestUseCase } from '../application/use-cases/add-session-guest.use-case';
import { AddSessionTeamUseCase } from '../application/use-cases/add-session-team.use-case';
import { CancelAttendanceUseCase } from '../application/use-cases/cancel-attendance.use-case';
import { ConfirmAttendanceUseCase } from '../application/use-cases/confirm-attendance.use-case';
import { CreateMatchSessionUseCase } from '../application/use-cases/create-match-session.use-case';
import { CreateSessionRoundUseCase } from '../application/use-cases/create-session-round.use-case';
import { FinishMatchSessionUseCase } from '../application/use-cases/finish-match-session.use-case';
import { GetMatchSessionUseCase } from '../application/use-cases/get-match-session.use-case';
import { ListMatchSessionsUseCase } from '../application/use-cases/list-match-sessions.use-case';
import { RemoveSessionAttendeeUseCase } from '../application/use-cases/remove-session-attendee.use-case';
import { StartMatchSessionUseCase } from '../application/use-cases/start-match-session.use-case';
import { UpdateSessionTeamsUseCase } from '../application/use-cases/update-session-teams.use-case';
import { SessionEventStreamService } from '../application/services/session-event-stream.service';

@Controller('match-sessions')
export class MatchSessionsController {
  constructor(
    private readonly createMatchSessionUseCase: CreateMatchSessionUseCase,
    private readonly listMatchSessionsUseCase: ListMatchSessionsUseCase,
    private readonly getMatchSessionUseCase: GetMatchSessionUseCase,
    private readonly finishMatchSessionUseCase: FinishMatchSessionUseCase,
    private readonly addSessionTeamUseCase: AddSessionTeamUseCase,
    private readonly updateSessionTeamsUseCase: UpdateSessionTeamsUseCase,
    private readonly createSessionRoundUseCase: CreateSessionRoundUseCase,
    private readonly startMatchSessionUseCase: StartMatchSessionUseCase,
    private readonly confirmAttendanceUseCase: ConfirmAttendanceUseCase,
    private readonly cancelAttendanceUseCase: CancelAttendanceUseCase,
    private readonly addSessionGuestUseCase: AddSessionGuestUseCase,
    private readonly removeSessionAttendeeUseCase: RemoveSessionAttendeeUseCase,
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

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateMatchSessionDto) {
    return this.createMatchSessionUseCase.execute(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/teams')
  addTeam(@Param('id') id: string, @Body() dto: SessionTeamInputDto) {
    return this.addSessionTeamUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id/teams')
  replaceTeams(@Param('id') id: string, @Body() dto: UpdateSessionTeamsDto) {
    return this.updateSessionTeamsUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/matches')
  createRound(@Param('id') id: string, @Body() dto: CreateSessionRoundDto) {
    return this.createSessionRoundUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/finish')
  finish(@Param('id') id: string) {
    return this.finishMatchSessionUseCase.execute(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/start')
  start(@Param('id') id: string, @Body() dto: StartMatchSessionDto) {
    return this.startMatchSessionUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/attendance')
  confirmAttendance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.confirmAttendanceUseCase.execute(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/attendance')
  cancelAttendance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cancelAttendanceUseCase.execute(id, user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/guests')
  addGuest(@Param('id') id: string, @Body() dto: AddSessionGuestDto) {
    return this.addSessionGuestUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id/attendees/:playerId')
  removeAttendee(@Param('id') id: string, @Param('playerId') playerId: string) {
    return this.removeSessionAttendeeUseCase.execute(id, playerId);
  }
}
