import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, IsNull, Not, Repository } from 'typeorm';
import { MatchParticipant } from '../../domain/entities/match-participant.entity';
import { Match } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchTeamSide } from '../../domain/enums/match-team-side.enum';
import { MatchRepository } from '../../domain/ports/match.repository';

@Injectable()
export class TypeOrmMatchRepository implements MatchRepository {
  constructor(
    @InjectRepository(Match)
    private readonly repository: Repository<Match>,
    @InjectRepository(MatchParticipant)
    private readonly participantRepository: Repository<MatchParticipant>,
  ) {}

  findAll(): Promise<Match[]> {
    return this.repository.find({
      relations: { participants: { player: true } },
    });
  }

  findById(id: string): Promise<Match | null> {
    return this.repository.findOne({
      where: { id },
      relations: { participants: { player: true } },
    });
  }

  findAllBySessionId(sessionId: string): Promise<Match[]> {
    return this.repository.find({
      where: { sessionId },
      relations: { participants: { player: true } },
      order: { createdAt: 'ASC' },
    });
  }

  findActiveWithDuration(): Promise<Match[]> {
    return this.repository.find({
      where: { status: MatchStatus.EN_CURSO, durationMinutes: Not(IsNull()) },
      relations: { participants: { player: true } },
    });
  }

  async create(data: DeepPartial<Match>): Promise<Match> {
    const match = this.repository.create(data);
    return this.repository.save(match);
  }

  save(match: Match): Promise<Match> {
    return this.repository.save(match);
  }

  async addParticipant(
    matchId: string,
    playerId: string,
    team: MatchTeamSide,
  ): Promise<MatchParticipant> {
    const participant = this.participantRepository.create({
      matchId,
      playerId,
      team,
    });
    return this.participantRepository.save(participant);
  }

  async setResult(
    matchId: string,
    homeScore: number,
    awayScore: number,
  ): Promise<Match> {
    await this.repository.update(matchId, { homeScore, awayScore });
    return this.findById(matchId) as Promise<Match>;
  }

  async adjustScore(
    matchId: string,
    team: MatchTeamSide,
    delta: number,
  ): Promise<Match> {
    const column = team === MatchTeamSide.HOME ? 'home_score' : 'away_score';
    await this.repository.query(
      `UPDATE matches SET ${column} = GREATEST(${column} + $1, 0) WHERE id = $2`,
      [delta, matchId],
    );
    return this.findById(matchId) as Promise<Match>;
  }

  async delete(matchId: string): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      // Los invitados se juntan ANTES de borrar: después ya no quedan filas
      // que los relacionen con el partido.
      const guests: { id: string }[] = await manager.query(
        `SELECT DISTINCT p.id
         FROM players p
         WHERE p.is_guest = true
           AND (
             EXISTS (SELECT 1 FROM match_participants mp
                     WHERE mp.player_id = p.id AND mp.match_id = $1)
             OR EXISTS (SELECT 1 FROM goals g
                        WHERE g.match_id = $1
                          AND (g.scorer_id = p.id OR g.assist_id = p.id))
           )`,
        [matchId],
      );

      await manager.delete(Match, { id: matchId });

      if (guests.length === 0) return;

      // Misma regla que al borrar la jornada: solo se borra el invitado que
      // ya no tiene nada. Los jugadores registrados nunca se borran.
      await manager.query(
        `DELETE FROM players p
         WHERE p.is_guest = true
           AND p.id = ANY($1)
           AND NOT EXISTS (SELECT 1 FROM users u WHERE u.player_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM session_attendees sa WHERE sa.player_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM session_team_players stp WHERE stp.player_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM match_participants mp WHERE mp.player_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM goals g WHERE g.scorer_id = p.id OR g.assist_id = p.id)
           AND NOT EXISTS (SELECT 1 FROM session_player_stats s WHERE s.player_id = p.id)`,
        [guests.map((guest) => guest.id)],
      );
    });
  }
}
