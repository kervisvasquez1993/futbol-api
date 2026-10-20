import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface LeaderboardRow {
  playerId: string;
  name: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  sessionsPlayed: number;
}

// Suma las dos fuentes: goles de las rondas (solo aprobados) y cargas manuales
// por jornada (session_player_stats, solo las aprobadas por un admin). Nunca
// se suman para un mismo jugador y jornada: si tiene el total de la jornada
// aprobado, ese total reemplaza sus goles (y asistencias) de las rondas. Los
// partidos sueltos tienen session_id NULL y el NOT EXISTS nunca los excluye.
// `matchesPlayed` son rondas jugadas: las jornadas manuales no suman ahí
// porque no se sabe cuántos partidos fueron; para eso está `sessionsPlayed`.
export const PLAYER_STATS_SQL = `
  SELECT
    p.id AS "playerId",
    p.name AS "name",
    COALESCE(mp.matches_played, 0)::int AS "matchesPlayed",
    (COALESCE(g.goals, 0) + COALESCE(s.goals, 0))::int AS "goals",
    (COALESCE(a.assists, 0) + COALESCE(s.assists, 0))::int AS "assists",
    COALESCE(j.sessions_played, 0)::int AS "sessionsPlayed"
  FROM players p
  LEFT JOIN (
    SELECT player_id, COUNT(*) AS matches_played
    FROM match_participants
    GROUP BY player_id
  ) mp ON mp.player_id = p.id
  LEFT JOIN (
    SELECT g.scorer_id, COUNT(*) AS goals
    FROM goals g
    JOIN matches m ON m.id = g.match_id
    WHERE g.status = 'aprobado'
      AND NOT EXISTS (
        SELECT 1 FROM session_player_stats s
        WHERE s.session_id = m.session_id
          AND s.player_id = g.scorer_id
          AND s.status = 'aprobada'
      )
    GROUP BY g.scorer_id
  ) g ON g.scorer_id = p.id
  LEFT JOIN (
    SELECT g.assist_id, COUNT(*) AS assists
    FROM goals g
    JOIN matches m ON m.id = g.match_id
    WHERE g.assist_id IS NOT NULL
      AND g.status = 'aprobado'
      AND NOT EXISTS (
        SELECT 1 FROM session_player_stats s
        WHERE s.session_id = m.session_id
          AND s.player_id = g.assist_id
          AND s.status = 'aprobada'
      )
    GROUP BY g.assist_id
  ) a ON a.assist_id = p.id
  LEFT JOIN (
    SELECT player_id, SUM(goals) AS goals, SUM(assists) AS assists
    FROM session_player_stats
    WHERE status = 'aprobada'
    GROUP BY player_id
  ) s ON s.player_id = p.id
  LEFT JOIN (
    -- Jornadas en las que jugó: alguna ronda o una carga manual.
    SELECT player_id, COUNT(DISTINCT session_id) AS sessions_played
    FROM (
      SELECT mp.player_id, m.session_id
      FROM match_participants mp
      JOIN matches m ON m.id = mp.match_id
      WHERE m.session_id IS NOT NULL
      UNION
      SELECT player_id, session_id
      FROM session_player_stats
      WHERE status = 'aprobada'
    ) x
    GROUP BY player_id
  ) j ON j.player_id = p.id
`;

@Injectable()
export class GetLeaderboardUseCase {
  constructor(private readonly dataSource: DataSource) {}

  execute(): Promise<LeaderboardRow[]> {
    return this.dataSource.query(`
      ${PLAYER_STATS_SQL}
      ORDER BY "goals" DESC, "assists" DESC, p.name ASC
    `);
  }
}
