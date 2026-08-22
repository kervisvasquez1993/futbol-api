import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Player } from '../../domain/entities/player.entity';
import { PlayerRepository } from '../../domain/ports/player.repository';

@Injectable()
export class TypeOrmPlayerRepository implements PlayerRepository {
  constructor(
    @InjectRepository(Player)
    private readonly repository: Repository<Player>,
  ) {}

  findAll(): Promise<Player[]> {
    return this.repository.find();
  }

  findById(id: string): Promise<Player | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Player[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repository.find({ where: { id: In(ids) } });
  }

  async create(data: Partial<Player>): Promise<Player> {
    const player = this.repository.create(data);
    return this.repository.save(player);
  }

  async update(id: string, data: Partial<Player>): Promise<Player> {
    await this.repository.update(id, data);
    return (await this.findById(id)) as Player;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
