import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { SetSessionPlayerStatsDto } from '../dtos/set-session-player-stats.dto';
import { assertAllowsManualStats } from '../helpers/manual-stats-rules.helper';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

// "Participei": carga (o corrige) los goles y asistencias de un jugador en una
// jornada sin rondas. Vale en cualquier estado: la jornada puede no haberse
// empezado nunca en la app.
@Injectable()
export class SetSessionPlayerStatsUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async execute(
    sessionId: string,
    playerId: string,
    dto: SetSessionPlayerStatsDto,
  ) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    assertAllowsManualStats(session);

    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError('Jugador no encontrado');
    }

    await this.matchSessionRepository.upsertPlayerStats(sessionId, playerId, {
      goals: dto.goals,
      assists: dto.assists,
    });
    this.sessionEventsService.emit(sessionId);

    const updatedSession = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(updatedSession);
  }
}
