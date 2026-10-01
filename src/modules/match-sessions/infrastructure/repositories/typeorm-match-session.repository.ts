import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionAttendee } from '../../domain/entities/session-attendee.entity';
import { SessionPlayerStat } from '../../domain/entities/session-player-stat.entity';
import { SessionTeamPlayer } from '../../domain/entities/session-team-player.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';
import { ManualStatStatus } from '../../domain/enums/manual-stat-status.enum';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import {
  MatchSessionRepository,
  SessionTeamsReplacement,
} from '../../domain/ports/match-session.repository';

@Injectable()
export class TypeOrmMatchSessionRepository implements MatchSessionRepository {
  constructor(
    @InjectRepository(MatchSession)
    private readonly repository: Repository<MatchSession>,
    @InjectRepository(SessionTeam)
    private readonly teamRepository: Repository<SessionTeam>,
    @InjectRepository(SessionAttendee)
    private readonly attendeeRepository: Repository<SessionAttendee>,
    @InjectRepository(SessionPlayerStat)
    private readonly statRepository: Repository<SessionPlayerStat>,
  ) {}

  async findAll(): Promise<MatchSession[]> {
    const sessions = await this.repository.find({
      relations: {
        teams: { players: { player: true } },
        attendees: { player: true },
        manualStats: { player: true },
      },
      order: {
        createdAt: 'DESC',
        teams: { joinOrder: 'ASC' },
        attendees: { createdAt: 'ASC' },
      },
    });
    return this.withManualStats(sessions);
  }

  async findById(id: string): Promise<MatchSession | null> {
    const session = await this.repository.findOne({
      where: { id },
      relations: {
        teams: { players: { player: true } },
        attendees: { player: true },
        manualStats: { player: true },
      },
      order: { teams: { joinOrder: 'ASC' }, attendees: { createdAt: 'ASC' } },
    });
    if (!session) return null;
    const [withStats] = await this.withManualStats([session]);
    return withStats;
  }

  // Ordena la carga manual y calcula allowsManualStats (jornada sin rondas) y
  // allowsLateManualStats (finalizada con rondas).
  private async withManualStats(
    sessions: MatchSession[],
  ): Promise<MatchSession[]> {
    if (sessions.length === 0) return sessions;

    const rows: { session_id: string }[] = await this.repository.query(
      `SELECT DISTINCT session_id FROM matches WHERE session_id = ANY($1)`,
      [sessions.map((session) => session.id)],
    );
    const withRounds = new Set(rows.map((row) => row.session_id));

    for (const session of sessions) {
      session.allowsManualStats = !withRounds.has(session.id);
      session.allowsLateManualStats =
        withRounds.has(session.id) &&
        session.status === MatchSessionStatus.FINALIZADA;
      session.manualStats.sort(
        (a, b) =>
          b.goals - a.goals ||
          b.assists - a.assists ||
          a.player.name.localeCompare(b.player.name),
      );
    }
    return sessions;
  }

  async create(data: DeepPartial<MatchSession>): Promise<MatchSession> {
    const session = this.repository.create(data);
    const saved = await this.repository.save(session);
    return (await this.findById(saved.id)) as MatchSession;
  }

  save(session: MatchSession): Promise<MatchSession> {
    return this.repository.save(session);
  }

  async addTeam(
    sessionId: string,
    data: DeepPartial<SessionTeam>,
  ): Promise<MatchSession> {
    const team = this.teamRepository.create({ ...data, sessionId });
    await this.teamRepository.save(team);
    return (await this.findById(sessionId)) as MatchSession;
  }

  async addAttendee(sessionId: string, playerId: string): Promise<void> {
    // orIgnore: confirmar dos veces no falla (unique session_id + player_id).
    await this.attendeeRepository
      .createQueryBuilder()
      .insert()
      .values({ sessionId, playerId })
      .orIgnore()
      .execute();
  }

  async removeAttendee(sessionId: string, playerId: string): Promise<void> {
    await this.attendeeRepository.delete({ sessionId, playerId });
  }

  async start(
    sessionId: string,
    data: Pick<
      MatchSession,
      'rotationMode' | 'durationMinutes' | 'goalLimit' | 'playersPerTeam'
    >,
    teams: DeepPartial<SessionTeam>[],
  ): Promise<MatchSession | null> {
    const started = await this.repository.manager.transaction(
      async (manager) => {
        const result = await manager
          .createQueryBuilder()
          .update(MatchSession)
          .set({ ...data, status: MatchSessionStatus.EN_CURSO })
          .where('id = :sessionId AND status = :status', {
            sessionId,
            status: MatchSessionStatus.CONVOCATORIA,
          })
          .execute();

        if (!result.affected) return false;

        await manager.save(
          teams.map((team) =>
            manager.create(SessionTeam, { ...team, sessionId }),
          ),
        );
        return true;
      },
    );

    return started ? this.findById(sessionId) : null;
  }

  async replaceTeams(
    sessionId: string,
    {
      update,
      create,
      empty,
      remove,
      attendeePlayerIds,
      playersPerTeam,
    }: SessionTeamsReplacement,
  ): Promise<MatchSession> {
    await this.repository.manager.transaction(async (manager) => {
      if (playersPerTeam !== undefined) {
        await manager.update(MatchSession, sessionId, { playersPerTeam });
      }

      const existingIds = [
        ...update.map((team) => team.id),
        ...empty.map((team) => team.id),
        ...remove,
      ];

      if (existingIds.length > 0) {
        await manager.delete(SessionTeamPlayer, {
          sessionTeamId: In(existingIds),
        });
      }

      if (remove.length > 0) {
        await manager.delete(SessionTeam, { id: In(remove) });
      }

      // Nombre temporal (el id, único) para que renombrar o intercambiar
      // nombres no choque con el unique (session_id, name) a mitad de camino.
      for (const team of [...update, ...empty]) {
        await manager.update(SessionTeam, team.id, { name: team.id });
      }

      for (const team of empty) {
        await manager.update(SessionTeam, team.id, {
          name: team.name,
          queuePosition: null,
        });
      }

      for (const team of update) {
        await manager.update(SessionTeam, team.id, {
          name: team.name,
          queuePosition: team.queuePosition,
        });
      }

      const players = update.flatMap((team) =>
        team.playerIds.map((playerId) => ({
          sessionTeamId: team.id,
          playerId,
        })),
      );
      if (players.length > 0) {
        await manager.insert(SessionTeamPlayer, players);
      }

      if (create.length > 0) {
        await manager.save(
          create.map((team) =>
            manager.create(SessionTeam, {
              sessionId,
              name: team.name,
              joinOrder: team.joinOrder,
              queuePosition: team.queuePosition,
              players: team.playerIds.map((playerId) => ({ playerId })),
            }),
          ),
        );
      }

      if (attendeePlayerIds.length > 0) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(SessionAttendee)
          .values(
            attendeePlayerIds.map((playerId) => ({ sessionId, playerId })),
          )
          .orIgnore()
          .execute();
      }
    });

    return (await this.findById(sessionId)) as MatchSession;
  }

  async updateTeamQueuePosition(
    sessionTeamId: string,
    queuePosition: number | null,
  ): Promise<void> {
    await this.teamRepository.update(sessionTeamId, { queuePosition });
  }

  async hasRounds(sessionId: string): Promise<boolean> {
    const [row] = await this.repository.query(
      `SELECT EXISTS (SELECT 1 FROM matches WHERE session_id = $1) AS "hasRounds"`,
      [sessionId],
    );
    return row.hasRounds;
  }

  async upsertPlayerStats(
    sessionId: string,
    playerId: string,
    {
      goals,
      assists,
      status,
    }: { goals: number; assists: number; status: ManualStatStatus },
  ): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(SessionPlayerStat)
        .values({ sessionId, playerId, goals, assists, status })
        .orUpdate(
          ['goals', 'assists', 'status', 'updated_at'],
          ['session_id', 'player_id'],
        )
        .execute();

      await manager
        .createQueryBuilder()
        .insert()
        .into(SessionAttendee)
        .values({ sessionId, playerId })
        .orIgnore()
        .execute();
    });
  }

  async approvePlayerStats(
    sessionId: string,
    playerId: string,
  ): Promise<boolean> {
    const result = await this.statRepository.update(
      { sessionId, playerId },
      { status: ManualStatStatus.APROBADA },
    );
    return !!result.affected;
  }

  async hasPlayerStats(sessionId: string, playerId: string): Promise<boolean> {
    return this.statRepository.exists({ where: { sessionId, playerId } });
  }

  async removePlayerStats(sessionId: string, playerId: string): Promise<void> {
    await this.statRepository.delete({ sessionId, playerId });
  }

  async delete(sessionId: string): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      // Los invitados se juntan ANTES de borrar: después ya no quedan filas
      // que los relacionen con la jornada.
      const guests: { id: string }[] = await manager.query(
        `SELECT DISTINCT p.id
         FROM players p
         WHERE p.is_guest = true
           AND (
             EXISTS (SELECT 1 FROM session_attendees sa
                     WHERE sa.player_id = p.id AND sa.session_id = $1)
             OR EXISTS (SELECT 1 FROM session_player_stats s
                        WHERE s.player_id = p.id AND s.session_id = $1)
             OR EXISTS (SELECT 1 FROM session_team_players stp
                        JOIN session_teams st ON st.id = stp.session_team_id
                        WHERE stp.player_id = p.id AND st.session_id = $1)
             OR EXISTS (SELECT 1 FROM match_participants mp
                        JOIN matches m ON m.id = mp.match_id
                        WHERE mp.player_id = p.id AND m.session_id = $1)
           )`,
        [sessionId],
      );

      await manager.delete(MatchSession, { id: sessionId });

      if (guests.length === 0) return;

      // Misma regla que quitar asistente: solo se borra el invitado que ya
      // no tiene nada. Los jugadores registrados nunca se borran.
      await manager.query(
        `DELETE FROM players p
         WHERE p.is_guest = true
           AND p.id = ANY($1)
           AND NOT EXISTS (SELECT 1 FROM users u WHERE u.player_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM session_attendees sa WHERE sa.player_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM session_team_players stp WHERE stp.player_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM match_participants mp WHERE mp.player_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM goals g WHERE g.scorer_id = p.id OR g.assist_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM session_player_stats s WHERE s.player_id = p.id)`,
        [guests.map((guest) => guest.id)],
      );
    });
  }
}
