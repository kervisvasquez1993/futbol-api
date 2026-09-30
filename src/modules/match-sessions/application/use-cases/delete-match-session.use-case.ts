import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { SessionEventsService } from '../services/session-events.service';

// Borra la jornada en cualquier estado (aunque tenga una ronda en curso) con
// sus rondas, goles, equipos, asistentes y cargas manuales. El ranking se
// calcula sobre esas tablas, así que las estadísticas desaparecen solas.
@Injectable()
export class DeleteMatchSessionUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async execute(sessionId: string): Promise<void> {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    await this.matchSessionRepository.delete(sessionId);
    this.sessionEventsService.emit(sessionId, 'deleted');
  }
}
