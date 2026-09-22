import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchSessionsModule } from '../match-sessions/match-sessions.module';
import { PlayersModule } from '../players/players.module';
import { UsersModule } from '../users/users.module';
import { MatchParticipant } from './domain/entities/match-participant.entity';
import { Match } from './domain/entities/match.entity';
import { MatchRepository } from './domain/ports/match.repository';
import { TypeOrmMatchRepository } from './infrastructure/repositories/typeorm-match.repository';
import { MatchLifecycleService } from './application/services/match-lifecycle.service';
import { AddParticipantUseCase } from './application/use-cases/add-participant.use-case';
import { AdjustMatchScoreUseCase } from './application/use-cases/adjust-match-score.use-case';
import { CreateMatchUseCase } from './application/use-cases/create-match.use-case';
import { FinishMatchUseCase } from './application/use-cases/finish-match.use-case';
import { GetMatchUseCase } from './application/use-cases/get-match.use-case';
import { JoinMatchUseCase } from './application/use-cases/join-match.use-case';
import { ListMatchesUseCase } from './application/use-cases/list-matches.use-case';
import { SetMatchResultUseCase } from './application/use-cases/set-match-result.use-case';
import { MatchesController } from './presentation/matches.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, MatchParticipant]),
    PlayersModule,
    UsersModule,
    forwardRef(() => MatchSessionsModule),
  ],
  controllers: [MatchesController],
  providers: [
    CreateMatchUseCase,
    ListMatchesUseCase,
    GetMatchUseCase,
    FinishMatchUseCase,
    AddParticipantUseCase,
    JoinMatchUseCase,
    SetMatchResultUseCase,
    AdjustMatchScoreUseCase,
    MatchLifecycleService,
    { provide: MatchRepository, useClass: TypeOrmMatchRepository },
  ],
  exports: [MatchRepository, MatchLifecycleService],
})
export class MatchesModule {}
