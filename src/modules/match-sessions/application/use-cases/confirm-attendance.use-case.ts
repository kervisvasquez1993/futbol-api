import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { assertHasLinkedPlayer } from '../helpers/assert-has-linked-player';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

// Vale en cualquier estado: en convocatoria confirma que va; en curso es
// "Cheguei" (queda sin equipo hasta que el admin lo ubique con PUT /teams);
// finalizada es "Estive lá".
@Injectable()
export class ConfirmAttendanceUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  // Idempotente: si ya estaba confirmado responde la jornada sin cambios.
  async execute(sessionId: string, currentUser: CurrentUserPayload) {
    const playerId = assertHasLinkedPlayer(currentUser);
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    await this.matchSessionRepository.addAttendee(sessionId, playerId);
    this.sessionEventsService.emit(sessionId);

    const updatedSession = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(updatedSession);
  }
}
