import { Injectable } from '@nestjs/common';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { SessionRoundFactory } from '../services/session-round.factory';

@Injectable()
export class AdvanceMatchSessionUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly matchRepository: MatchRepository,
    private readonly sessionRoundFactory: SessionRoundFactory,
  ) {}

  async execute(sessionId: string) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session || session.status !== MatchSessionStatus.EN_CURSO) {
      return null;
    }

    if (session.rotationMode !== SessionRotationMode.WINNER_STAYS) {
      // En modo manual nunca se genera una ronda sola: la crea el usuario
      // con POST /match-sessions/:id/matches.
      return null;
    }

    const matches = await this.matchRepository.findAllBySessionId(sessionId);
    const lastMatch = matches[matches.length - 1];

    if (!lastMatch || lastMatch.status !== MatchStatus.FINALIZADO) {
      return null;
    }

    if (lastMatch.homeScore === lastMatch.awayScore) {
      // Empate: no hay ganador claro, no se puede rotar solo.
      return null;
    }

    const winnerTeamId =
      lastMatch.homeScore > lastMatch.awayScore
        ? lastMatch.homeSessionTeamId
        : lastMatch.awaySessionTeamId;
    const loserTeamId =
      winnerTeamId === lastMatch.homeSessionTeamId
        ? lastMatch.awaySessionTeamId
        : lastMatch.homeSessionTeamId;

    const winnerTeam = session.teams.find((team) => team.id === winnerTeamId);
    const loserTeam = session.teams.find((team) => team.id === loserTeamId);

    if (!winnerTeam || !loserTeam) {
      return null;
    }

    // El perdedor entra al final de la fila...
    const currentMax = session.teams.reduce(
      (max, team) => Math.max(max, team.queuePosition ?? -1),
      -1,
    );

    const queueBeforeLoser = session.teams
      .filter(
        (team) =>
          team.id !== winnerTeam.id &&
          team.id !== loserTeam.id &&
          team.queuePosition != null,
      )
      .sort((a, b) => (a.queuePosition as number) - (b.queuePosition as number));

    // ...y sale de la fila el primero que estaba esperando. Con solo 2 equipos
    // la fila está vacía en este punto: el propio perdedor es "el primero de
    // la fila" (revancha) una vez que se lo agrega.
    const nextTeam = queueBeforeLoser[0] ?? loserTeam;

    await this.matchSessionRepository.updateTeamQueuePosition(
      loserTeam.id,
      currentMax + 1,
    );

    if (nextTeam.id !== loserTeam.id) {
      await this.matchSessionRepository.updateTeamQueuePosition(
        nextTeam.id,
        null,
      );
    }

    return this.sessionRoundFactory.createRound(
      session,
      winnerTeam,
      nextTeam,
      session.durationMinutes,
      session.goalLimit,
    );
  }
}
