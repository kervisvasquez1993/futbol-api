import { Injectable } from '@nestjs/common';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { CreateMatchSessionDto } from '../dtos/create-match-session.dto';
import { withQueue } from '../helpers/session-response.helper';
import {
  assertBenchRotationTeams,
  assertValidSessionTeams,
  buildSessionTeams,
} from '../helpers/session-teams.helper';
import { SessionRoundFactory } from '../services/session-round.factory';

@Injectable()
export class CreateMatchSessionUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly sessionRoundFactory: SessionRoundFactory,
  ) {}

  async execute(dto: CreateMatchSessionDto) {
    const teams = dto.teams ?? [];
    // Sin equipos es una convocatoria: los jugadores confirman asistencia y
    // el admin arma los equipos después con POST /match-sessions/:id/start.
    const isConvocatoria = teams.length === 0;

    const rotationMode = dto.rotationMode ?? SessionRotationMode.MANUAL;
    const isBenchRotation = rotationMode === SessionRotationMode.BENCH_ROTATION;

    if (!isConvocatoria) {
      await assertValidSessionTeams(teams, this.playerRepository);
      if (isBenchRotation) {
        assertBenchRotationTeams(teams);
      }
    }

    const session = await this.matchSessionRepository.create({
      name: dto.name,
      date: dto.date ? new Date(dto.date) : new Date(),
      status: isConvocatoria
        ? MatchSessionStatus.CONVOCATORIA
        : MatchSessionStatus.EN_CURSO,
      rotationMode,
      durationMinutes: dto.durationMinutes ?? null,
      goalLimit: dto.goalLimit ?? null,
      playersPerTeam: dto.playersPerTeam ?? null,
      goldenGoal: dto.goldenGoal ?? false,
      teams: buildSessionTeams(
        teams,
        rotationMode === SessionRotationMode.WINNER_STAYS,
      ),
    });

    // Con banco la rotación sale de attendees: los de los equipos también.
    if (isBenchRotation && !isConvocatoria) {
      await this.matchSessionRepository.addAttendees(
        session.id,
        teams.flatMap((team) => team.playerIds),
      );
      session.attendees = (
        (await this.matchSessionRepository.findById(session.id)) as MatchSession
      ).attendees;
    }

    const currentMatch = isConvocatoria
      ? null
      : await this.sessionRoundFactory.createFirstRound(session);
    if (currentMatch) {
      session.allowsManualStats = false;
    }

    return { session: withQueue(session), currentMatch };
  }
}
