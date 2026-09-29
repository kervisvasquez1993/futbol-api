import { Injectable } from '@nestjs/common';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { findOpenConvocatoria } from '../helpers/find-open-convocatoria.helper';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

@Injectable()
export class RemoveSessionAttendeeUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  // Si el jugador no estaba en la lista responde la jornada sin cambios.
  async execute(sessionId: string, playerId: string) {
    const session = await findOpenConvocatoria(
      this.matchSessionRepository,
      sessionId,
    );

    const attendee = session.attendees.find(
      (candidate) => candidate.playerId === playerId,
    );

    if (attendee) {
      await this.matchSessionRepository.removeAttendee(sessionId, playerId);

      // Un invitado que nunca jugó (típico: nombre mal escrito) se borra para
      // que no aparezca en la lista de invitados a reclamar en el registro.
      if (
        attendee.player.isGuest &&
        !(await this.playerRepository.hasHistory(playerId))
      ) {
        await this.playerRepository.delete(playerId);
      }

      this.sessionEventsService.emit(sessionId);
    }

    const updatedSession = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(updatedSession);
  }
}
