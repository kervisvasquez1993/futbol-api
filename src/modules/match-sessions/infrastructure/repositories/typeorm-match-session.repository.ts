import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';

@Injectable()
export class TypeOrmMatchSessionRepository implements MatchSessionRepository {
  constructor(
    @InjectRepository(MatchSession)
    private readonly repository: Repository<MatchSession>,
  ) {}

  findAll(): Promise<MatchSession[]> {
    return this.repository.find({
      relations: { teams: { players: { player: true } } },
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<MatchSession | null> {
    return this.repository.findOne({
      where: { id },
      relations: { teams: { players: { player: true } } },
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
}
