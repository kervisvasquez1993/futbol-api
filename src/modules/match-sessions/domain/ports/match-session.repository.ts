import { DeepPartial } from 'typeorm';
import { MatchSession } from '../entities/match-session.entity';
import { SessionTeam } from '../entities/session-team.entity';

export abstract class MatchSessionRepository {
  abstract findAll(): Promise<MatchSession[]>;
  abstract findById(id: string): Promise<MatchSession | null>;
  abstract create(data: DeepPartial<MatchSession>): Promise<MatchSession>;
  abstract save(session: MatchSession): Promise<MatchSession>;
  abstract addTeam(
    sessionId: string,
    data: DeepPartial<SessionTeam>,
  ): Promise<MatchSession>;
  abstract updateTeamQueuePosition(
    sessionTeamId: string,
    queuePosition: number | null,
  ): Promise<void>;
}
