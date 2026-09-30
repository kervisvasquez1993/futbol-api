import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PlayerRepository } from '../../domain/ports/player.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import {
  LeaderboardRow,
  PLAYER_STATS_SQL,
} from '../../../stats/application/use-cases/get-leaderboard.use-case';

@Injectable()
export class GetPlayerStatsUseCase {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly dataSource: DataSource,
  ) {}

  // Mismo cálculo que el leaderboard, para que perfil y ranking coincidan.
  async execute(playerId: string): Promise<LeaderboardRow> {
    const player = await this.playerRepository.findById(playerId);

    if (!player) {
      throw new NotFoundError('Jugador no encontrado');
    }

    const [stats] = await this.dataSource.query(
      `${PLAYER_STATS_SQL} WHERE p.id = $1`,
      [playerId],
    );

    return stats;
  }
}
