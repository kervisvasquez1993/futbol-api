import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';

@Injectable()
export class TypeOrmMatchSessionRepository implements MatchSessionRepository {
  constructor(
    @InjectRepository(MatchSession)
    private readonly repository: Repository<MatchSession>,
    @InjectRepository(SessionTeam)
    private readonly teamRepository: Repository<SessionTeam>,
  ) {}

  findAll(): Promise<MatchSession[]> {
    return this.repository.find({
      relations: { teams: { players: { player: true } } },
      order: { createdAt: 'DESC', teams: { joinOrder: 'ASC' } },
    });
  }

  findById(id: string): Promise<MatchSession | null> {
    return this.repository.findOne({
      where: { id },
      relations: { teams: { players: { player: true } } },
      order: { teams: { joinOrder: 'ASC' } },
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

  async updateTeamQueuePosition(
    sessionTeamId: string,
    queuePosition: number | null,
  ): Promise<void> {
    await this.teamRepository.update(sessionTeamId, { queuePosition });
  }
}
