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

// Suma las dos fuentes: goles de las rondas y cargas manuales por jornada
// (session_player_stats). Una jornada nunca tiene las dos a la vez.
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
    SELECT scorer_id, COUNT(*) AS goals
    FROM goals
    GROUP BY scorer_id
  ) g ON g.scorer_id = p.id
  LEFT JOIN (
    SELECT assist_id, COUNT(*) AS assists
    FROM goals
    WHERE assist_id IS NOT NULL
    GROUP BY assist_id
  ) a ON a.assist_id = p.id
  LEFT JOIN (
    SELECT player_id, SUM(goals) AS goals, SUM(assists) AS assists
    FROM session_player_stats
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
      SELECT player_id, session_id FROM session_player_stats
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
