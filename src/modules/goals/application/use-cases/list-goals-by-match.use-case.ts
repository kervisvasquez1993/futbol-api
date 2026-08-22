import { Injectable } from '@nestjs/common';
import { GoalRepository } from '../../domain/ports/goal.repository';

@Injectable()
export class ListGoalsByMatchUseCase {
  constructor(private readonly goalRepository: GoalRepository) {}

  execute(matchId: string) {
    return this.goalRepository.findByMatchId(matchId);
  }
}
