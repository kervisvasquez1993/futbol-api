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

  // Plantel: los invitados quedan afuera.
  findAll(): Promise<Player[]> {
    return this.repository.find({ where: { isGuest: false } });
  }

  findUnclaimedGuests(): Promise<Player[]> {
    return this.repository
      .createQueryBuilder('player')
      .select([
        'player.id',
        'player.name',
        'player.imageUrl',
        'player.isGuest',
        'player.createdAt',
      ])
      .where('player.isGuest = true')
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM users u WHERE u.player_id = player.id)',
      )
      .orderBy('player.name', 'ASC')
      .getMany();
  }

  // Jugó algún partido, estuvo en un equipo, confirmó asistencia a alguna
  // jornada o tiene estadísticas cargadas a mano.
  async hasHistory(id: string): Promise<boolean> {
    const [row] = await this.repository.query(
      `SELECT
         EXISTS (SELECT 1 FROM match_participants WHERE player_id = $1)
         OR EXISTS (SELECT 1 FROM session_team_players WHERE player_id = $1)
         OR EXISTS (SELECT 1 FROM session_attendees WHERE player_id = $1)
         OR EXISTS (SELECT 1 FROM session_player_stats WHERE player_id = $1)
         AS "hasHistory"`,
      [id],
    );
    return row.hasHistory;
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
