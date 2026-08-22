import { Goal } from '../entities/goal.entity';

export abstract class GoalRepository {
  abstract findById(id: string): Promise<Goal | null>;
  abstract findByMatchId(matchId: string): Promise<Goal[]>;
  abstract create(data: Partial<Goal>): Promise<Goal>;
  abstract delete(id: string): Promise<void>;
}
