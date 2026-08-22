import { Match } from '../entities/match.entity';

export abstract class MatchRepository {
  abstract findAll(): Promise<Match[]>;
  abstract findById(id: string): Promise<Match | null>;
  abstract create(data: Partial<Match>): Promise<Match>;
  abstract save(match: Match): Promise<Match>;
}
