import { Injectable } from '@nestjs/common';
import { GoalRepository } from '../../domain/ports/goal.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';

@Injectable()
export class DeleteGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly matchRepository: MatchRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const goal = await this.goalRepository.findById(id);

    if (!goal) {
      throw new NotFoundError('Gol no encontrado');
    }

    await this.goalRepository.delete(id);

    const match = await this.matchRepository.findById(goal.matchId);
    const scorerTeam = match?.participants.find(
      (participant) => participant.playerId === goal.scorerId,
    )?.team;

    if (scorerTeam) {
      await this.matchRepository.adjustScore(goal.matchId, scorerTeam, -1);
    }
  }
}
