import { Injectable } from '@nestjs/common';
import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';

@Injectable()
export class SessionRoundFactory {
  constructor(private readonly matchRepository: MatchRepository) {}

  createRound(
    session: MatchSession,
    home: SessionTeam,
    away: SessionTeam,
    durationMinutes: number | null,
    goalLimit: number | null,
  ) {
    return this.matchRepository.create({
      name: session.name,
      date: session.date,
      status: MatchStatus.EN_CURSO,
      homeTeamName: home.name,
      awayTeamName: away.name,
      sessionId: session.id,
      homeSessionTeamId: home.id,
      awaySessionTeamId: away.id,
      durationMinutes,
      goalLimit,
      participants: [
        ...home.players.map((player) => ({
          playerId: player.playerId,
          team: MatchTeamSide.HOME,
        })),
        ...away.players.map((player) => ({
          playerId: player.playerId,
          team: MatchTeamSide.AWAY,
        })),
      ],
    });
  }
}
