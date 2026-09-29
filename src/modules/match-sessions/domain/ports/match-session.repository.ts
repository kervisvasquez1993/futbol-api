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
  abstract addAttendee(sessionId: string, playerId: string): Promise<void>;
  abstract removeAttendee(sessionId: string, playerId: string): Promise<void>;
  // Pasa la jornada de 'convocatoria' a 'en_curso' con sus equipos. Devuelve
  // null si ya no estaba en convocatoria (otro admin la empezó antes).
  abstract start(
    sessionId: string,
    data: Pick<MatchSession, 'rotationMode' | 'durationMinutes' | 'goalLimit'>,
    teams: DeepPartial<SessionTeam>[],
  ): Promise<MatchSession | null>;
  abstract updateTeamQueuePosition(
    sessionTeamId: string,
    queuePosition: number | null,
  ): Promise<void>;
}
