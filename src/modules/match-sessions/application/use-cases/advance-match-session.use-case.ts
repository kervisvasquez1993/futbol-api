import { Injectable } from '@nestjs/common';
import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';

@Injectable()
export class AdvanceMatchSessionUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly matchRepository: MatchRepository,
  ) {}

  async execute(sessionId: string) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session || session.status !== MatchSessionStatus.EN_CURSO) {
      return null;
    }

    const matches = await this.matchRepository.findAllBySessionId(sessionId);
    const lastMatch = matches[matches.length - 1];

    if (!lastMatch || lastMatch.status !== MatchStatus.FINALIZADO) {
      return null;
    }

    const teams = session.teams;

    if (teams.length === 2) {
      const [teamA, teamB] = teams;
      return this.createRound(session, teamA, teamB);
    }

    if (lastMatch.homeScore === lastMatch.awayScore) {
      return null;
    }

    const winnerTeamId =
      lastMatch.homeScore > lastMatch.awayScore
        ? lastMatch.homeSessionTeamId
        : lastMatch.awaySessionTeamId;

    const winnerTeam = teams.find((team) => team.id === winnerTeamId);
    const restingTeam = teams.find(
      (team) =>
        team.id !== lastMatch.homeSessionTeamId &&
        team.id !== lastMatch.awaySessionTeamId,
    );

    if (!winnerTeam || !restingTeam) {
      return null;
    }

    return this.createRound(session, winnerTeam, restingTeam);
  }

  private createRound(session: MatchSession, home: SessionTeam, away: SessionTeam) {
    return this.matchRepository.create({
      name: session.name,
      date: session.date,
      status: MatchStatus.EN_CURSO,
      homeTeamName: home.name,
      awayTeamName: away.name,
      sessionId: session.id,
      homeSessionTeamId: home.id,
      awaySessionTeamId: away.id,
      durationMinutes: session.durationMinutes,
      goalLimit: session.goalLimit,
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
