import { DeepPartial } from 'typeorm';
import { MatchParticipant } from '../entities/match-participant.entity';
import { Match } from '../entities/match.entity';
import { MatchTeamSide } from '../enums/match-team-side.enum';

export abstract class MatchRepository {
  abstract findAll(): Promise<Match[]>;
  abstract findById(id: string): Promise<Match | null>;
  abstract findAllBySessionId(sessionId: string): Promise<Match[]>;
  abstract findActiveWithDuration(): Promise<Match[]>;
  abstract create(data: DeepPartial<Match>): Promise<Match>;
  abstract save(match: Match): Promise<Match>;
  abstract addParticipant(
    matchId: string,
    playerId: string,
    team: MatchTeamSide,
  ): Promise<MatchParticipant>;
  abstract setResult(
    matchId: string,
    homeScore: number,
    awayScore: number,
  ): Promise<Match>;
  abstract adjustScore(
    matchId: string,
    team: MatchTeamSide,
    delta: number,
  ): Promise<Match>;
}
