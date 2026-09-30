import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

// El admin confirma lo que cargó el jugador: recién ahí suma al ranking.
// Para rechazar, el admin la borra o la corrige con su PUT.
@Injectable()
export class ApproveSessionPlayerStatsUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async execute(sessionId: string, playerId: string) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    const approved = await this.matchSessionRepository.approvePlayerStats(
      sessionId,
      playerId,
    );
    if (!approved) {
      throw new NotFoundError(
        'Este jugador no tiene estadísticas cargadas en la jornada',
      );
    }

    this.sessionEventsService.emit(sessionId);

    const updatedSession = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(updatedSession);
  }
}
