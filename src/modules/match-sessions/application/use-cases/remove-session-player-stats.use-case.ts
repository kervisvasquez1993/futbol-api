import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

// "No participé": borra la carga manual del jugador y deja la asistencia como
// está. Si no tenía carga responde la jornada sin cambios.
@Injectable()
export class RemoveSessionPlayerStatsUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async execute(sessionId: string, playerId: string) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    if (session.manualStats.some((stat) => stat.playerId === playerId)) {
      await this.matchSessionRepository.removePlayerStats(sessionId, playerId);
      this.sessionEventsService.emit(sessionId);
    }

    const updatedSession = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(updatedSession);
  }
}
