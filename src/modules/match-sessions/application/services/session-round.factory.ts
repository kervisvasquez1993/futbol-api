import { Injectable } from '@nestjs/common';
import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { Match } from '../../../matches/domain/entities/match.entity';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { SessionTeam } from '../../domain/entities/session-team.entity';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { PickedFillIns, pickFillIns } from '../helpers/pick-fill-ins';
import { RandomService } from './random.service';

@Injectable()
export class SessionRoundFactory {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly randomService: RandomService,
  ) {}

  // En 'winner_stays' la ronda 1 la juegan los dos primeros equipos; en
  // 'manual' la arma el admin después.
  async createFirstRound(session: MatchSession): Promise<Match | null> {
    if (session.rotationMode !== SessionRotationMode.WINNER_STAYS) {
      return null;
    }

    const [firstTeam, secondTeam] = [...session.teams].sort(
      (a, b) => a.joinOrder - b.joinOrder,
    );
    return this.createRound(
      session,
      firstTeam,
      secondTeam,
      session.durationMinutes,
      session.goalLimit,
    );
  }

  // Con `donorTeam`, los equipos incompletos se completan para esta ronda con
  // jugadores de ese equipo (isFillIn). Las plantillas no cambian.
  async createRound(
    session: MatchSession,
    home: SessionTeam,
    away: SessionTeam,
    durationMinutes: number | null,
    goalLimit: number | null,
    donorTeam: SessionTeam | null = null,
  ) {
    const homeIds = home.players.map((player) => player.playerId);
    const awayIds = away.players.map((player) => player.playerId);
    const fillIns = donorTeam
      ? await this.pickFillIns(session, homeIds, awayIds, donorTeam)
      : { home: [], away: [] };

    const participants = (
      playerIds: string[],
      team: MatchTeamSide,
      isFillIn: boolean,
    ) => playerIds.map((playerId) => ({ playerId, team, isFillIn }));

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
        ...participants(homeIds, MatchTeamSide.HOME, false),
        ...participants(fillIns.home, MatchTeamSide.HOME, true),
        ...participants(awayIds, MatchTeamSide.AWAY, false),
        ...participants(fillIns.away, MatchTeamSide.AWAY, true),
      ],
    });
  }

  private async pickFillIns(
    session: MatchSession,
    home: string[],
    away: string[],
    donorTeam: SessionTeam,
  ): Promise<PickedFillIns> {
    // Sin tamaño configurado (jornadas viejas): el equipo con más jugadores.
    const size =
      session.playersPerTeam ??
      Math.max(0, ...session.teams.map((team) => team.players.length));

    const matches = await this.matchRepository.findAllBySessionId(session.id);
    const fillInCounts = new Map<string, number>();
    for (const participant of matches.flatMap((match) => match.participants)) {
      if (participant.isFillIn) {
        fillInCounts.set(
          participant.playerId,
          (fillInCounts.get(participant.playerId) ?? 0) + 1,
        );
      }
    }

    return pickFillIns({
      size,
      home,
      away,
      donors: donorTeam.players.map((player) => player.playerId),
      fillInCounts,
      randomInt: (max) => this.randomService.int(max),
    });
  }
}
