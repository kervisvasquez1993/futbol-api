import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesModule } from '../matches/matches.module';
import { Goal } from './domain/entities/goal.entity';
import { GoalRepository } from './domain/ports/goal.repository';
import { TypeOrmGoalRepository } from './infrastructure/repositories/typeorm-goal.repository';
import { AddGoalUseCase } from './application/use-cases/add-goal.use-case';
import { DeleteGoalUseCase } from './application/use-cases/delete-goal.use-case';
import { ListGoalsByMatchUseCase } from './application/use-cases/list-goals-by-match.use-case';
import { GoalsController } from './presentation/goals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Goal]), MatchesModule],
  controllers: [GoalsController],
  providers: [
    AddGoalUseCase,
    ListGoalsByMatchUseCase,
    DeleteGoalUseCase,
    { provide: GoalRepository, useClass: TypeOrmGoalRepository },
  ],
})
export class GoalsModule {}
