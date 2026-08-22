import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface LeaderboardRow {
  playerId: string;
  name: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
}

@Injectable()
export class GetLeaderboardUseCase {
  constructor(private readonly dataSource: DataSource) {}

  execute(): Promise<LeaderboardRow[]> {
    return this.dataSource.query(`
      SELECT
        p.id AS "playerId",
        p.name AS "name",
        COALESCE(mp.matches_played, 0)::int AS "matchesPlayed",
        COALESCE(g.goals, 0)::int AS "goals",
        COALESCE(a.assists, 0)::int AS "assists"
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
      ORDER BY "goals" DESC, "assists" DESC, p.name ASC
    `);
  }
}
