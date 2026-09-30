import { DeepPartial } from 'typeorm';
import { ManualStatStatus } from '../enums/manual-stat-status.enum';
import { MatchSession } from '../entities/match-session.entity';
import { SessionTeam } from '../entities/session-team.entity';

export interface SessionTeamsReplacement {
  update: {
    id: string;
    name: string;
    queuePosition: number | null;
    playerIds: string[];
  }[];
  create: {
    name: string;
    joinOrder: number;
    queuePosition: number | null;
    playerIds: string[];
  }[];
  // Equipos que ya jugaron y no vinieron: quedan sin plantilla ni fila (los
  // partidos los referencian). `name` permite liberar un nombre que se reusa.
  empty: { id: string; name: string }[];
  // Equipos que no vinieron y nunca jugaron.
  remove: string[];
  attendeePlayerIds: string[];
}

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
  abstract replaceTeams(
    sessionId: string,
    replacement: SessionTeamsReplacement,
  ): Promise<MatchSession>;
  abstract updateTeamQueuePosition(
    sessionTeamId: string,
    queuePosition: number | null,
  ): Promise<void>;
  abstract hasRounds(sessionId: string): Promise<boolean>;
  // Upsert de la carga manual; también suma al jugador a los asistentes.
  abstract upsertPlayerStats(
    sessionId: string,
    playerId: string,
    stats: { goals: number; assists: number; status: ManualStatStatus },
  ): Promise<void>;
  // Devuelve false si el jugador no tenía carga en la jornada.
  abstract approvePlayerStats(
    sessionId: string,
    playerId: string,
  ): Promise<boolean>;
  abstract removePlayerStats(
    sessionId: string,
    playerId: string,
  ): Promise<void>;
  // Borra la jornada (con todo lo que cuelga por CASCADE) y los invitados que
  // quedaron sin historial, en una sola transacción.
  abstract delete(sessionId: string): Promise<void>;
}
