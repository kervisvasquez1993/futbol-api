import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { ManualStatStatus } from '../../domain/enums/manual-stat-status.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { SetSessionPlayerStatsDto } from '../dtos/set-session-player-stats.dto';
import { assertCanLoadManualStats } from '../helpers/manual-stats-rules.helper';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

export interface StatsActor {
  userId: string;
  // Endpoint de admin (players/:playerId/stats) o del propio jugador (my-stats).
  byAdmin: boolean;
}

// "Participei": carga (o corrige) los goles y asistencias de un jugador en una
// jornada sin rondas (en cualquier estado: puede no haberse empezado nunca en
// la app), o en una finalizada con rondas si el jugador no jugó ninguna. Lo que carga el jugador queda pendiente (también
// si edita una carga ya aprobada); lo que carga un admin queda aprobado.
@Injectable()
export class SetSessionPlayerStatsUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly matchRepository: MatchRepository,
    private readonly sessionEventsService: SessionEventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(
    sessionId: string,
    playerId: string,
    dto: SetSessionPlayerStatsDto,
    { userId, byAdmin }: StatsActor,
  ) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError('Jugador no encontrado');
    }

    await assertCanLoadManualStats(
      session,
      playerId,
      this.matchRepository,
      byAdmin,
    );

    await this.matchSessionRepository.upsertPlayerStats(sessionId, playerId, {
      goals: dto.goals,
      assists: dto.assists,
      status: byAdmin ? ManualStatStatus.APROBADA : ManualStatStatus.PENDIENTE,
    });
    this.sessionEventsService.emit(sessionId);

    // El jugador cargó: les avisa a los admins para que aprueben. El admin
    // cargó o corrigió: le avisa al jugador.
    const context = {
      sessionId,
      sessionName: session.name,
      playerId,
      playerName: player.name,
      goals: dto.goals,
      assists: dto.assists,
      actorUserId: userId,
    };
    await (byAdmin
      ? this.notificationsService.manualStatsSetByAdmin(context)
      : this.notificationsService.manualStatsSubmitted(context));

    const updatedSession = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(updatedSession);
  }
}
