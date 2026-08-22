import { Injectable } from '@nestjs/common';
import { GoalRepository } from '../../domain/ports/goal.repository';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { ConflictError, NotFoundError } from '../../../../shared/errors/domain-errors';

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

    const match = await this.matchRepository.findById(goal.matchId);

    if (match?.status !== MatchStatus.EN_CURSO) {
      throw new ConflictError('El partido ya finalizó, no se pueden eliminar goles');
    }

    await this.goalRepository.delete(id);
  }
}
