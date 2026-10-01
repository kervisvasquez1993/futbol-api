import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { ManualStatStatus } from '../../domain/enums/manual-stat-status.enum';
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
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(sessionId: string, playerId: string, actorUserId: string) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    const stat = session.manualStats.find(
      (candidate) => candidate.playerId === playerId,
    );
    const approved =
      stat &&
      (await this.matchSessionRepository.approvePlayerStats(
        sessionId,
        playerId,
      ));
    if (!approved) {
      throw new NotFoundError(
        'Este jugador no tiene estadísticas cargadas en la jornada',
      );
    }

    this.sessionEventsService.emit(sessionId);

    // Aprobar algo ya aprobado no vuelve a avisar.
    if (stat.status === ManualStatStatus.PENDIENTE) {
      await this.notificationsService.manualStatsApproved({
        sessionId,
        sessionName: session.name,
        playerId,
        playerName: stat.player.name,
        goals: stat.goals,
        assists: stat.assists,
        actorUserId,
      });
    }

    const updatedSession = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(updatedSession);
  }
}
