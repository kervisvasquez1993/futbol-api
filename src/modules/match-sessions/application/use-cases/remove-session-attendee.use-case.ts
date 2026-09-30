import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { assertCanLeaveSession } from '../helpers/assert-can-leave-session';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

@Injectable()
export class RemoveSessionAttendeeUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly matchRepository: MatchRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  // Si el jugador no estaba en la lista responde la jornada sin cambios.
  async execute(sessionId: string, playerId: string) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    const attendee = session.attendees.find(
      (candidate) => candidate.playerId === playerId,
    );

    if (attendee) {
      // Con la jornada empezada, solo quien no está en un equipo ni jugó.
      await assertCanLeaveSession(
        session,
        playerId,
        this.matchRepository,
        'Este jugador ya está en un equipo o jugó una ronda',
      );

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
