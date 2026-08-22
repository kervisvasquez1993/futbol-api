import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../../domain/entities/match.entity';
import { MatchRepository } from '../../domain/ports/match.repository';

@Injectable()
export class TypeOrmMatchRepository implements MatchRepository {
  constructor(
    @InjectRepository(Match)
    private readonly repository: Repository<Match>,
  ) {}

  findAll(): Promise<Match[]> {
    return this.repository.find({ relations: { participants: true } });
  }

  findById(id: string): Promise<Match | null> {
    return this.repository.findOne({
      where: { id },
      relations: { participants: true },
    });
  }

  async create(data: Partial<Match>): Promise<Match> {
    const match = this.repository.create(data);
    return this.repository.save(match);
  }

  save(match: Match): Promise<Match> {
    return this.repository.save(match);
  }
}
