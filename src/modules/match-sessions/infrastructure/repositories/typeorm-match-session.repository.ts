import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionAttendee } from '../../domain/entities/session-attendee.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';

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

  async updateTeamQueuePosition(
    sessionTeamId: string,
    queuePosition: number | null,
  ): Promise<void> {
    await this.teamRepository.update(sessionTeamId, { queuePosition });
  }
}
