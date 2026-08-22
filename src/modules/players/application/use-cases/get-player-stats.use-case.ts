import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PlayerRepository } from '../../domain/ports/player.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';

@Injectable()
export class GetPlayerStatsUseCase {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(playerId: string) {
    const player = await this.playerRepository.findById(playerId);

    if (!player) {
      throw new NotFoundError('Jugador no encontrado');
    }

    const [goalsResult] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM goals WHERE scorer_id = $1`,
      [playerId],
    );

    const [assistsResult] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM goals WHERE assist_id = $1`,
      [playerId],
    );

    const [matchesResult] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM match_participants WHERE player_id = $1`,
      [playerId],
    );

    return {
      playerId: player.id,
      name: player.name,
      goals: goalsResult.count,
      assists: assistsResult.count,
      matchesPlayed: matchesResult.count,
    };
  }
}
