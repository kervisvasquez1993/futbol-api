import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { MatchSession } from './domain/entities/match-session.entity';
import { SessionTeam } from './domain/entities/session-team.entity';
import { SessionTeamPlayer } from './domain/entities/session-team-player.entity';
import { MatchSessionRepository } from './domain/ports/match-session.repository';
import { TypeOrmMatchSessionRepository } from './infrastructure/repositories/typeorm-match-session.repository';
import { AddSessionTeamUseCase } from './application/use-cases/add-session-team.use-case';
import { AdvanceMatchSessionUseCase } from './application/use-cases/advance-match-session.use-case';
import { CreateMatchSessionUseCase } from './application/use-cases/create-match-session.use-case';
import { CreateSessionRoundUseCase } from './application/use-cases/create-session-round.use-case';
import { FinishMatchSessionUseCase } from './application/use-cases/finish-match-session.use-case';
import { GetMatchSessionUseCase } from './application/use-cases/get-match-session.use-case';
import { ListMatchSessionsUseCase } from './application/use-cases/list-match-sessions.use-case';
import { SessionEventStreamService } from './application/services/session-event-stream.service';
import { SessionEventsService } from './application/services/session-events.service';
import { SessionRoundFactory } from './application/services/session-round.factory';
import { MatchSessionsController } from './presentation/match-sessions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchSession, SessionTeam, SessionTeamPlayer]),
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
    SessionRoundFactory,
    SessionEventsService,
    SessionEventStreamService,
    { provide: MatchSessionRepository, useClass: TypeOrmMatchSessionRepository },
  ],
  exports: [MatchSessionRepository, AdvanceMatchSessionUseCase, SessionEventsService],
})
export class MatchSessionsModule {}
