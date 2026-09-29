import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { assertHasLinkedPlayer } from '../helpers/assert-has-linked-player';
import { findOpenConvocatoria } from '../helpers/find-open-convocatoria.helper';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

@Injectable()
export class CancelAttendanceUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  // Si no estaba confirmado responde la jornada sin cambios.
  async execute(sessionId: string, currentUser: CurrentUserPayload) {
    const playerId = assertHasLinkedPlayer(currentUser);
    await findOpenConvocatoria(this.matchSessionRepository, sessionId);

    await this.matchSessionRepository.removeAttendee(sessionId, playerId);
    this.sessionEventsService.emit(sessionId);

    const session = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(session);
  }
}
