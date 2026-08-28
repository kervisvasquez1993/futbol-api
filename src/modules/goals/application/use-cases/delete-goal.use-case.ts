import { Injectable } from '@nestjs/common';
import { GoalRepository } from '../../domain/ports/goal.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';

@Injectable()
export class DeleteGoalUseCase {
  constructor(private readonly goalRepository: GoalRepository) {}

  async execute(id: string): Promise<void> {
    const goal = await this.goalRepository.findById(id);

    if (!goal) {
      throw new NotFoundError('Gol no encontrado');
    }

    await this.goalRepository.delete(id);
  }
}
