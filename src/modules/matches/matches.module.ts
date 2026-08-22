import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayersModule } from '../players/players.module';
import { Match } from './domain/entities/match.entity';
import { MatchRepository } from './domain/ports/match.repository';
import { TypeOrmMatchRepository } from './infrastructure/repositories/typeorm-match.repository';
import { CreateMatchUseCase } from './application/use-cases/create-match.use-case';
import { FinishMatchUseCase } from './application/use-cases/finish-match.use-case';
import { GetMatchUseCase } from './application/use-cases/get-match.use-case';
import { ListMatchesUseCase } from './application/use-cases/list-matches.use-case';
import { MatchesController } from './presentation/matches.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Match]), PlayersModule],
  controllers: [MatchesController],
  providers: [
    CreateMatchUseCase,
    ListMatchesUseCase,
    GetMatchUseCase,
    FinishMatchUseCase,
    { provide: MatchRepository, useClass: TypeOrmMatchRepository },
  ],
  exports: [MatchRepository],
})
export class MatchesModule {}
