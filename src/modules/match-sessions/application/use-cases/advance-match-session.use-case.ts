import { Injectable } from '@nestjs/common';
import { Match } from '../../../matches/domain/entities/match.entity';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { nextLineup, RotationRound } from '../helpers/bench-rotation';
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

    if (session.rotationMode === SessionRotationMode.MANUAL) {
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

    if (session.rotationMode === SessionRotationMode.BENCH_ROTATION) {
      return this.advanceBenchRotation(
        session,
        matches,
        lastMatch,
        winnerTeam,
        loserTeam,
      );
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
      .sort(
        (a, b) => (a.queuePosition as number) - (b.queuePosition as number),
      );

    // ...y sale de la fila el primero que estaba esperando. Con solo 2 equipos
    // la fila está vacía en este punto: el propio perdedor es "el primero de
    // la fila" (revancha) una vez que se lo agrega.
    const nextTeam = queueBeforeLoser[0] ?? loserTeam;

    // Un equipo que se vació con PUT /teams mientras jugaba no vuelve a la fila.
    const loserHasPlayers = loserTeam.players.length > 0;

    if (loserHasPlayers) {
      await this.matchSessionRepository.updateTeamQueuePosition(
        loserTeam.id,
        currentMax + 1,
      );
    }

    if (
      winnerTeam.players.length === 0 ||
      (nextTeam.id === loserTeam.id && !loserHasPlayers)
    ) {
      // Sin rival (o sin ganador) con jugadores: la próxima ronda la arma el admin.
      return null;
    }

    if (nextTeam.id !== loserTeam.id) {
      await this.matchSessionRepository.updateTeamQueuePosition(
        nextTeam.id,
        null,
      );
    }

    // Si entra otro equipo, el que perdió presta jugadores para completar.
    // En la revancha (2 equipos) no hay de dónde sacar.
    return this.sessionRoundFactory.createRound(
      session,
      winnerTeam,
      nextTeam,
      session.durationMinutes,
      session.goalLimit,
      nextTeam.id !== loserTeam.id ? loserTeam : null,
      false,
    );
  }

  // "Quem ganha fica + banco": la próxima formación sale de nextLineup (el
  // mismo algoritmo que la vista previa del front). El equipo que ganó
  // conserva su nombre con los que siguen; el otro pasa a ser el que entra.
  private async advanceBenchRotation(
    session: MatchSession,
    matches: Match[],
    lastMatch: Match,
    winnerTeam: SessionTeam,
    loserTeam: SessionTeam,
  ) {
    const playersOf = (match: Match, side: MatchTeamSide) =>
      match.participants
        .filter((participant) => participant.team === side)
        .map((participant) => participant.playerId);
    const rounds: RotationRound[] = matches.map((match) => ({
      home: playersOf(match, MatchTeamSide.HOME),
      away: playersOf(match, MatchTeamSide.AWAY),
    }));

    // Quien se fue durante la última ronda no vuelve a entrar.
    const retired = new Set(
      await this.matchSessionRepository.findRetiredPlayerIds(session.id),
    );
    const last = rounds[rounds.length - 1];
    rounds[rounds.length - 1] = {
      home: last.home.filter((id) => !retired.has(id)),
      away: last.away.filter((id) => !retired.has(id)),
    };

    const inTeams = new Set(
      session.teams.flatMap((team) =>
        team.players.map((player) => player.playerId),
      ),
    );
    const lineup = nextLineup(
      {
        teamSize:
          session.playersPerTeam ??
          Math.max(1, ...session.teams.map((team) => team.players.length)),
        rounds,
        bench: session.attendees
          .filter((attendee) => !inTeams.has(attendee.playerId))
          .map((attendee) => attendee.playerId),
        arrivalOrder: session.attendees.map((attendee) => attendee.playerId),
      },
      lastMatch.homeScore > lastMatch.awayScore
        ? MatchTeamSide.HOME
        : MatchTeamSide.AWAY,
    );

    if (lineup.winners.length === 0 || lineup.challengers.length === 0) {
      // No queda gente para armar dos equipos: la arma el admin.
      return null;
    }

    await this.matchSessionRepository.setTeamLineups([
      { teamId: winnerTeam.id, playerIds: lineup.winners },
      { teamId: loserTeam.id, playerIds: lineup.challengers },
    ]);

    const withPlayers = (team: SessionTeam, playerIds: string[]) =>
      ({
        ...team,
        players: playerIds.map((playerId) => ({ playerId })),
      }) as SessionTeam;

    return this.sessionRoundFactory.createRound(
      session,
      withPlayers(winnerTeam, lineup.winners),
      withPlayers(loserTeam, lineup.challengers),
      session.durationMinutes,
      session.goalLimit,
      null,
      false,
    );
  }
}
