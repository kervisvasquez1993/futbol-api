import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionAttendee } from '../../domain/entities/session-attendee.entity';
import { SessionTeamPlayer } from '../../domain/entities/session-team-player.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';
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
  ) {}

  findAll(): Promise<MatchSession[]> {
    return this.repository.find({
      relations: {
        teams: { players: { player: true } },
        attendees: { player: true },
      },
      order: {
        createdAt: 'DESC',
        teams: { joinOrder: 'ASC' },
        attendees: { createdAt: 'ASC' },
      },
    });
  }

  findById(id: string): Promise<MatchSession | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        teams: { players: { player: true } },
        attendees: { player: true },
      },
      order: { teams: { joinOrder: 'ASC' }, attendees: { createdAt: 'ASC' } },
    });
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
    data: Pick<MatchSession, 'rotationMode' | 'durationMinutes' | 'goalLimit'>,
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
    }: SessionTeamsReplacement,
  ): Promise<MatchSession> {
    await this.repository.manager.transaction(async (manager) => {
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
}
