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

  async isClaimed(id: string): Promise<boolean> {
    const [row] = await this.repository.query(
      `SELECT EXISTS (SELECT 1 FROM users WHERE player_id = $1) AS "claimed"`,
      [id],
    );
    return row.claimed;
  }

  // Donde los dos ya coinciden (mismo partido, jornada o equipo) queda la fila
  // del que se conserva: así no choca con los unique y nada se cuenta doble.
  async mergeInto(sourceId: string, targetId: string): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      const run = (sql: string) => manager.query(sql, [sourceId, targetId]);

      // Goles: un gol entre los dos (uno goleador y el otro asistente) se
      // queda sin asistencia, porque sería el mismo jugador.
      await run(
        `UPDATE goals SET assist_id = NULL
         WHERE (scorer_id = $1 AND assist_id = $2)
            OR (scorer_id = $2 AND assist_id = $1)`,
      );
      await run(`UPDATE goals SET scorer_id = $2 WHERE scorer_id = $1`);
      await run(`UPDATE goals SET assist_id = $2 WHERE assist_id = $1`);

      await run(
        `DELETE FROM match_participants
         WHERE player_id = $1
           AND match_id IN (SELECT match_id FROM match_participants WHERE player_id = $2)`,
      );
      await run(
        `UPDATE match_participants SET player_id = $2 WHERE player_id = $1`,
      );

      // Plantillas: si el que queda ya está en algún equipo de esa jornada,
      // no se lo suma a otro.
      await run(
        `DELETE FROM session_team_players stp
         USING session_teams st
         WHERE stp.session_team_id = st.id
           AND stp.player_id = $1
           AND EXISTS (
             SELECT 1 FROM session_team_players t2
             JOIN session_teams st2 ON st2.id = t2.session_team_id
             WHERE t2.player_id = $2 AND st2.session_id = st.session_id
           )`,
      );
      await run(
        `UPDATE session_team_players SET player_id = $2 WHERE player_id = $1`,
      );

      // Asistencia: queda la llegada más temprana, y activo si alguno lo estaba.
      await run(
        `UPDATE session_attendees t
         SET created_at = LEAST(t.created_at, s.created_at),
             left_at = CASE WHEN t.left_at IS NULL OR s.left_at IS NULL
                            THEN NULL ELSE GREATEST(t.left_at, s.left_at) END
         FROM session_attendees s
         WHERE t.player_id = $2 AND s.player_id = $1
           AND s.session_id = t.session_id`,
      );
      await run(
        `DELETE FROM session_attendees
         WHERE player_id = $1
           AND session_id IN (SELECT session_id FROM session_attendees WHERE player_id = $2)`,
      );
      await run(
        `UPDATE session_attendees SET player_id = $2 WHERE player_id = $1`,
      );

      // Carga manual en la misma jornada: el mayor de cada uno (son la misma
      // persona, sumar contaría doble), pendiente si alguna lo estaba.
      await run(
        `UPDATE session_player_stats t
         SET goals = GREATEST(t.goals, s.goals),
             assists = GREATEST(t.assists, s.assists),
             status = CASE WHEN t.status = 'aprobada' AND s.status = 'aprobada'
                           THEN t.status ELSE 'pendiente' END,
             updated_at = now()
         FROM session_player_stats s
         WHERE t.player_id = $2 AND s.player_id = $1
           AND s.session_id = t.session_id`,
      );
      await run(
        `DELETE FROM session_player_stats
         WHERE player_id = $1
           AND session_id IN (SELECT session_id FROM session_player_stats WHERE player_id = $2)`,
      );
      await run(
        `UPDATE session_player_stats SET player_id = $2 WHERE player_id = $1`,
      );

      await run(`UPDATE notifications SET player_id = $2 WHERE player_id = $1`);
      await manager.query(`DELETE FROM players WHERE id = $1`, [sourceId]);
    });
  }
}
