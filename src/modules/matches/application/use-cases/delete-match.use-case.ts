import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { SessionEventsService } from '../../../match-sessions/application/services/session-events.service';
import { SessionRotationMode } from '../../../match-sessions/domain/enums/session-rotation-mode.enum';
import { MatchSessionRepository } from '../../../match-sessions/domain/ports/match-session.repository';
import { Match } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchRepository } from '../../domain/ports/match.repository';
import { MatchEventsService } from '../services/match-events.service';

// Borra un partido suelto o una ronda de jornada, en cualquier estado, con sus
// goles y participantes. El ranking se calcula sobre esas tablas, así que las
// estadísticas desaparecen solas.
@Injectable()
export class DeleteMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchEventsService: MatchEventsService,
    @Inject(forwardRef(() => MatchSessionRepository))
    private readonly matchSessionRepository: MatchSessionRepository,
    @Inject(forwardRef(() => SessionEventsService))
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async execute(matchId: string): Promise<void> {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    await this.matchRepository.delete(matchId);
    await this.requeueTeamsIfActiveRound(match);

    this.matchEventsService.emit(matchId, 'deleted');
    if (match.sessionId) {
      this.sessionEventsService.emit(match.sessionId);
    }
  }

  // En 'winner_stays' los equipos de la ronda en curso salieron de la fila al
  // empezarla. Si se borra, vuelven al frente para que no queden fuera de la
  // rotación; el admin arma la próxima ronda con POST /match-sessions/:id/matches.
  private async requeueTeamsIfActiveRound(match: Match): Promise<void> {
    if (!match.sessionId || match.status !== MatchStatus.EN_CURSO) return;

    const session = await this.matchSessionRepository.findById(match.sessionId);

    if (session?.rotationMode !== SessionRotationMode.WINNER_STAYS) return;

    const playingIds = [match.homeSessionTeamId, match.awaySessionTeamId];
    const requeued = session.teams.filter(
      (team) => playingIds.includes(team.id) && team.players.length > 0,
    );

    if (requeued.length === 0) return;

    const waiting = session.teams
      .filter(
        (team) => !playingIds.includes(team.id) && team.queuePosition != null,
      )
      .sort(
        (a, b) => (a.queuePosition as number) - (b.queuePosition as number),
      );

    const queue = [...requeued, ...waiting];
    for (const [position, team] of queue.entries()) {
      await this.matchSessionRepository.updateTeamQueuePosition(
        team.id,
        position,
      );
    }
  }
}
