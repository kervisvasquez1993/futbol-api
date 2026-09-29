import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/errors/domain-errors';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { StartMatchSessionDto } from '../dtos/start-match-session.dto';
import { withQueue } from '../helpers/session-response.helper';
import {
  assertValidSessionTeams,
  buildSessionTeams,
} from '../helpers/session-teams.helper';
import { SessionEventsService } from '../services/session-events.service';
import { SessionRoundFactory } from '../services/session-round.factory';

@Injectable()
export class StartMatchSessionUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly sessionRoundFactory: SessionRoundFactory,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async execute(sessionId: string, dto: StartMatchSessionDto) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    if (session.status === MatchSessionStatus.FINALIZADA) {
      throw new ConflictError('La jornada ya está finalizada');
    }

    if (session.status !== MatchSessionStatus.CONVOCATORIA) {
      throw new ConflictError('La jornada ya empezó');
    }

    // Los jugadores no tienen por qué estar en attendees: el admin puede sumar
    // a alguien que vino sin confirmar.
    await assertValidSessionTeams(dto.teams, this.playerRepository);

    const rotationMode = dto.rotationMode ?? session.rotationMode;

    const startedSession = await this.matchSessionRepository.start(
      sessionId,
      {
        rotationMode,
        durationMinutes: dto.durationMinutes ?? session.durationMinutes,
        goalLimit: dto.goalLimit ?? session.goalLimit,
      },
      buildSessionTeams(
        dto.teams,
        rotationMode === SessionRotationMode.WINNER_STAYS,
      ),
    );

    if (!startedSession) {
      throw new ConflictError('La jornada ya empezó');
    }

    const currentMatch =
      await this.sessionRoundFactory.createFirstRound(startedSession);

    this.sessionEventsService.emit(sessionId);

    return { session: withQueue(startedSession), currentMatch };
  }
}
