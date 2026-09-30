import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { MatchSession } from './domain/entities/match-session.entity';
import { SessionAttendee } from './domain/entities/session-attendee.entity';
import { SessionPlayerStat } from './domain/entities/session-player-stat.entity';
import { SessionTeam } from './domain/entities/session-team.entity';
import { SessionTeamPlayer } from './domain/entities/session-team-player.entity';
import { MatchSessionRepository } from './domain/ports/match-session.repository';
import { TypeOrmMatchSessionRepository } from './infrastructure/repositories/typeorm-match-session.repository';
import { AddSessionGuestUseCase } from './application/use-cases/add-session-guest.use-case';
import { AddSessionTeamUseCase } from './application/use-cases/add-session-team.use-case';
import { AdvanceMatchSessionUseCase } from './application/use-cases/advance-match-session.use-case';
import { CancelAttendanceUseCase } from './application/use-cases/cancel-attendance.use-case';
import { ConfirmAttendanceUseCase } from './application/use-cases/confirm-attendance.use-case';
import { CreateMatchSessionUseCase } from './application/use-cases/create-match-session.use-case';
import { CreateSessionRoundUseCase } from './application/use-cases/create-session-round.use-case';
import { DeleteMatchSessionUseCase } from './application/use-cases/delete-match-session.use-case';
import { FinishMatchSessionUseCase } from './application/use-cases/finish-match-session.use-case';
import { GetMatchSessionUseCase } from './application/use-cases/get-match-session.use-case';
import { ListMatchSessionsUseCase } from './application/use-cases/list-match-sessions.use-case';
import { RemoveSessionAttendeeUseCase } from './application/use-cases/remove-session-attendee.use-case';
import { RemoveSessionPlayerStatsUseCase } from './application/use-cases/remove-session-player-stats.use-case';
import { SetSessionPlayerStatsUseCase } from './application/use-cases/set-session-player-stats.use-case';
import { StartMatchSessionUseCase } from './application/use-cases/start-match-session.use-case';
import { UpdateSessionTeamsUseCase } from './application/use-cases/update-session-teams.use-case';
import { SessionEventStreamService } from './application/services/session-event-stream.service';
import { SessionEventsService } from './application/services/session-events.service';
import { SessionRoundFactory } from './application/services/session-round.factory';
import { MatchSessionsController } from './presentation/match-sessions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatchSession,
      SessionTeam,
      SessionTeamPlayer,
      SessionAttendee,
      SessionPlayerStat,
    ]),
    PlayersModule,
    forwardRef(() => MatchesModule),
  ],
  controllers: [MatchSessionsController],
  providers: [
    CreateMatchSessionUseCase,
    ListMatchSessionsUseCase,
    GetMatchSessionUseCase,
    FinishMatchSessionUseCase,
    AdvanceMatchSessionUseCase,
    AddSessionTeamUseCase,
    CreateSessionRoundUseCase,
    StartMatchSessionUseCase,
    UpdateSessionTeamsUseCase,
    ConfirmAttendanceUseCase,
    CancelAttendanceUseCase,
    AddSessionGuestUseCase,
    RemoveSessionAttendeeUseCase,
    SetSessionPlayerStatsUseCase,
    RemoveSessionPlayerStatsUseCase,
    DeleteMatchSessionUseCase,
    SessionRoundFactory,
    SessionEventsService,
    SessionEventStreamService,
    {
      provide: MatchSessionRepository,
      useClass: TypeOrmMatchSessionRepository,
    },
  ],
  exports: [
    MatchSessionRepository,
    AdvanceMatchSessionUseCase,
    SessionEventsService,
  ],
})
export class MatchSessionsModule {}
