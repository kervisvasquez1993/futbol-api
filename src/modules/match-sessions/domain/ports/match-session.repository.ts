import { DeepPartial } from 'typeorm';
import { MatchSession } from '../entities/match-session.entity';

export abstract class MatchSessionRepository {
  abstract findAll(): Promise<MatchSession[]>;
  abstract findById(id: string): Promise<MatchSession | null>;
  abstract create(data: DeepPartial<MatchSession>): Promise<MatchSession>;
  abstract save(session: MatchSession): Promise<MatchSession>;
}
