import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from '../../domain/entities/goal.entity';
import { GoalRepository } from '../../domain/ports/goal.repository';

@Injectable()
export class TypeOrmGoalRepository implements GoalRepository {
  constructor(
    @InjectRepository(Goal)
    private readonly repository: Repository<Goal>,
  ) {}

  findById(id: string): Promise<Goal | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByMatchId(matchId: string): Promise<Goal[]> {
    return this.repository.find({
      where: { matchId },
      relations: { scorer: true, assist: true },
    });
  }

  async create(data: Partial<Goal>): Promise<Goal> {
    const goal = this.repository.create(data);
    return this.repository.save(goal);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
