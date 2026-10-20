import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesModule } from '../matches/matches.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { Goal } from './domain/entities/goal.entity';
import { GoalRepository } from './domain/ports/goal.repository';
import { TypeOrmGoalRepository } from './infrastructure/repositories/typeorm-goal.repository';
import { AddGoalUseCase } from './application/use-cases/add-goal.use-case';
import { ApproveGoalUseCase } from './application/use-cases/approve-goal.use-case';
import { DeleteGoalUseCase } from './application/use-cases/delete-goal.use-case';
import { GetMatchSummaryUseCase } from './application/use-cases/get-match-summary.use-case';
import { ListGoalsByMatchUseCase } from './application/use-cases/list-goals-by-match.use-case';
import { GoalsController } from './presentation/goals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Goal]),
    MatchesModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [GoalsController],
  providers: [
    AddGoalUseCase,
    ListGoalsByMatchUseCase,
    DeleteGoalUseCase,
    GetMatchSummaryUseCase,
    ApproveGoalUseCase,
    { provide: GoalRepository, useClass: TypeOrmGoalRepository },
  ],
})
export class GoalsModule {}
