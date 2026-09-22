import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { SessionTeamInputDto } from '../dtos/create-match-session.dto';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

@Injectable()
export class AddSessionTeamUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async execute(sessionId: string, dto: SessionTeamInputDto) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    if (session.status === MatchSessionStatus.FINALIZADA) {
      throw new ConflictError('La jornada ya está finalizada');
    }

    const nameTaken = session.teams.some(
      (team) => team.name.trim().toLowerCase() === dto.name.trim().toLowerCase(),
    );
    if (nameTaken) {
      throw new ValidationError(
        'Ya existe un equipo con ese nombre en esta jornada',
      );
    }

    const uniqueNewIds = Array.from(new Set(dto.playerIds));
    if (uniqueNewIds.length !== dto.playerIds.length) {
      throw new ValidationError('Un jugador no puede repetirse en el equipo');
    }

    const existingPlayerIds = new Set(
      session.teams.flatMap((team) => team.players.map((p) => p.playerId)),
    );
    const overlap = uniqueNewIds.some((id) => existingPlayerIds.has(id));
    if (overlap) {
      throw new ValidationError(
        'Un jugador no puede estar en más de un equipo de la jornada',
      );
    }

    const players = await this.playerRepository.findByIds(uniqueNewIds);
    if (players.length !== uniqueNewIds.length) {
      throw new ValidationError('Alguno de los jugadores indicados no existe');
    }

    const currentMaxJoinOrder = session.teams.reduce(
      (max, team) => Math.max(max, team.joinOrder),
      -1,
    );
    const currentMaxQueuePosition = session.teams.reduce(
      (max, team) => Math.max(max, team.queuePosition ?? -1),
      -1,
    );

    const updatedSession = await this.matchSessionRepository.addTeam(
      sessionId,
      {
        name: dto.name,
        joinOrder: currentMaxJoinOrder + 1,
        queuePosition:
          session.rotationMode === SessionRotationMode.WINNER_STAYS
            ? currentMaxQueuePosition + 1
            : null,
        players: uniqueNewIds.map((playerId) => ({ playerId })),
      },
    );

    this.sessionEventsService.emit(sessionId);

    return withQueue(updatedSession);
  }
}
