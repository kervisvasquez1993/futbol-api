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
}
