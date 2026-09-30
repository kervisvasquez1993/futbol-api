import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { assertCanLeaveSession } from '../helpers/assert-can-leave-session';
import { assertHasLinkedPlayer } from '../helpers/assert-has-linked-player';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

@Injectable()
export class CancelAttendanceUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly matchRepository: MatchRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  // Si no estaba confirmado responde la jornada sin cambios.
  async execute(sessionId: string, currentUser: CurrentUserPayload) {
    const playerId = assertHasLinkedPlayer(currentUser);
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    await assertCanLeaveSession(
      session,
      playerId,
      this.matchRepository,
      'Ya estás en un equipo de la jornada: pide al administrador que te saque',
    );

    await this.matchSessionRepository.removeAttendee(sessionId, playerId);
    this.sessionEventsService.emit(sessionId);

    const updatedSession = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(updatedSession);
  }
}
