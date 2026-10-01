import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';
import { StatsActor } from './set-session-player-stats.use-case';

// "No participé": borra la carga manual del jugador y deja la asistencia como
// está. Si no tenía carga responde la jornada sin cambios.
@Injectable()
export class RemoveSessionPlayerStatsUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly sessionEventsService: SessionEventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(
    sessionId: string,
    playerId: string,
    { userId, byAdmin }: StatsActor,
  ) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    const stat = session.manualStats.find(
      (candidate) => candidate.playerId === playerId,
    );

    if (stat) {
      await this.matchSessionRepository.removePlayerStats(sessionId, playerId);
      this.sessionEventsService.emit(sessionId);

      // Si la borró un admin, el jugador se entera (rechazo). Si la borró el
      // propio jugador, el aviso pendiente a los admins ya no aplica.
      const context = {
        sessionId,
        sessionName: session.name,
        playerId,
        playerName: stat.player.name,
        goals: stat.goals,
        assists: stat.assists,
        actorUserId: userId,
      };
      await (byAdmin
        ? this.notificationsService.manualStatsRejected(context)
        : this.notificationsService.manualStatsWithdrawn(context));
    }

    const updatedSession = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(updatedSession);
  }
}
