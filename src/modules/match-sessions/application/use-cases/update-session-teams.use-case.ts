import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { Match } from '../../../matches/domain/entities/match.entity';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import {
  MatchSessionRepository,
  SessionTeamsReplacement,
} from '../../domain/ports/match-session.repository';
import {
  UpdateSessionTeamInputDto,
  UpdateSessionTeamsDto,
} from '../dtos/update-session-teams.dto';
import { withQueue } from '../helpers/session-response.helper';
import {
  assertBenchRotationTeams,
  assertValidBench,
  assertValidSessionTeams,
} from '../helpers/session-teams.helper';
import { SessionEventsService } from '../services/session-events.service';

const normalizeName = (name: string) => name.trim().toLowerCase();

// Reemplaza las plantillas de la jornada. El partido en curso conserva sus
// participants: los cambios valen desde la próxima ronda, que SessionRoundFactory
// arma leyendo team.players.
@Injectable()
export class UpdateSessionTeamsUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly matchRepository: MatchRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async execute(sessionId: string, dto: UpdateSessionTeamsDto) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    if (session.status === MatchSessionStatus.CONVOCATORIA) {
      throw new ConflictError('La jornada todavía no empezó');
    }

    await assertValidSessionTeams(dto.teams, this.playerRepository);

    const isBenchRotation =
      session.rotationMode === SessionRotationMode.BENCH_ROTATION;
    const bench = dto.benchPlayerIds;

    if (isBenchRotation) {
      assertBenchRotationTeams(dto.teams);
    }
    if (bench) {
      await assertValidBench(dto.teams, bench, this.playerRepository);
    }

    const existingById = new Map(session.teams.map((team) => [team.id, team]));
    const bodyIds = dto.teams.flatMap((team) => (team.id ? [team.id] : []));

    if (
      new Set(bodyIds).size !== bodyIds.length ||
      bodyIds.some((id) => !existingById.has(id))
    ) {
      throw new ValidationError('Algún equipo no pertenece a esta jornada');
    }

    const matches = await this.matchRepository.findAllBySessionId(sessionId);
    const playedTeamIds = new Set(
      matches.flatMap((match) => [
        match.homeSessionTeamId,
        match.awaySessionTeamId,
      ]),
    );
    const currentMatch = matches.find(
      (match) => match.status === MatchStatus.EN_CURSO,
    );
    const playingTeamIds = new Set(
      currentMatch
        ? [currentMatch.homeSessionTeamId, currentMatch.awaySessionTeamId]
        : [],
    );

    const usesQueue =
      session.rotationMode === SessionRotationMode.WINNER_STAYS &&
      session.status === MatchSessionStatus.EN_CURSO;
    const queuePositionOf = (team: UpdateSessionTeamInputDto) =>
      usesQueue ? (team.queuePosition ?? null) : null;

    if (usesQueue) {
      this.assertValidQueue(dto.teams, playingTeamIds);
    }

    // Un equipo nuevo con el nombre de uno existente que no vino (típico:
    // sacarlo y volver a sumarlo) reusa ese equipo en vez de chocar con el
    // unique (session_id, name).
    const unlistedByName = new Map(
      session.teams
        .filter((team) => !bodyIds.includes(team.id))
        .map((team) => [normalizeName(team.name), team]),
    );
    const teams = dto.teams.map((team) => ({
      ...team,
      id: team.id ?? unlistedByName.get(normalizeName(team.name))?.id,
    }));
    const listedIds = new Set(
      teams.flatMap((team) => (team.id ? [team.id] : [])),
    );
    const unlisted = session.teams.filter((team) => !listedIds.has(team.id));

    const bodyNames = new Set(teams.map((team) => normalizeName(team.name)));
    let nextJoinOrder =
      session.teams.reduce((max, team) => Math.max(max, team.joinOrder), -1) +
      1;

    const replacement: SessionTeamsReplacement = {
      update: teams
        .filter((team) => team.id)
        .map((team) => ({
          id: team.id as string,
          name: team.name,
          queuePosition: queuePositionOf(team),
          playerIds: team.playerIds,
        })),
      create: teams
        .filter((team) => !team.id)
        .map((team) => ({
          name: team.name,
          joinOrder: nextJoinOrder++,
          queuePosition: queuePositionOf(team),
          playerIds: team.playerIds,
        })),
      empty: unlisted
        .filter((team) => playedTeamIds.has(team.id))
        .map((team) => ({
          id: team.id,
          // Libera el nombre si otro equipo del body pasa a usarlo.
          name: bodyNames.has(normalizeName(team.name))
            ? `${team.name} (${team.id.slice(0, 4)})`
            : team.name,
        })),
      remove: unlisted
        .filter((team) => !playedTeamIds.has(team.id))
        .map((team) => team.id),
      attendeePlayerIds: [
        ...this.newAttendees(session, teams),
        ...(bench ?? []),
      ],
      ...(isBenchRotation &&
        bench &&
        this.departures(session, teams, bench, matches)),
      playersPerTeam: dto.playersPerTeam,
    };

    const updatedSession = await this.matchSessionRepository.replaceTeams(
      sessionId,
      replacement,
    );

    this.sessionEventsService.emit(sessionId);

    return withQueue(updatedSession);
  }

  private assertValidQueue(
    teams: UpdateSessionTeamInputDto[],
    playingTeamIds: Set<string | null>,
  ): void {
    const inQueue = teams.filter((team) => team.queuePosition != null);

    if (inQueue.some((team) => team.id && playingTeamIds.has(team.id))) {
      throw new ValidationError(
        'Un equipo que está jugando no puede estar en la fila',
      );
    }

    const positions = inQueue
      .map((team) => team.queuePosition as number)
      .sort((a, b) => a - b);

    if (positions.some((position, index) => position !== index)) {
      throw new ValidationError('Las posiciones de la fila no son válidas');
    }
  }

  // bench_rotation: el attendee que no quedó ni en un equipo ni en el banco se
  // fue. Si no jugó ninguna ronda se borra; si jugó queda retirado (sus
  // rondas siguen contando, pero ya no entra).
  private departures(
    session: MatchSession,
    teams: UpdateSessionTeamInputDto[],
    bench: string[],
    matches: Match[],
  ): Pick<
    SessionTeamsReplacement,
    'removeAttendeePlayerIds' | 'retireAttendeePlayerIds'
  > {
    const staying = new Set([
      ...teams.flatMap((team) => team.playerIds),
      ...bench,
    ]);
    const played = new Set(
      matches.flatMap((match) =>
        match.participants.map((participant) => participant.playerId),
      ),
    );
    const leaving = session.attendees
      .map((attendee) => attendee.playerId)
      .filter((playerId) => !staying.has(playerId));

    return {
      removeAttendeePlayerIds: leaving.filter((id) => !played.has(id)),
      retireAttendeePlayerIds: leaving.filter((id) => played.has(id)),
    };
  }

  // Todo jugador que quedó en un equipo también "vino" a la jornada.
  private newAttendees(
    session: MatchSession,
    teams: UpdateSessionTeamInputDto[],
  ): string[] {
    const attendeeIds = new Set(
      session.attendees.map((attendee) => attendee.playerId),
    );
    return teams
      .flatMap((team) => team.playerIds)
      .filter((playerId) => !attendeeIds.has(playerId));
  }
}
