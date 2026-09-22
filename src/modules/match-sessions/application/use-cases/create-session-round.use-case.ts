import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { CreateSessionRoundDto } from '../dtos/create-session-round.dto';
import { SessionEventsService } from '../services/session-events.service';
import { SessionRoundFactory } from '../services/session-round.factory';

@Injectable()
export class CreateSessionRoundUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly matchRepository: MatchRepository,
    private readonly sessionRoundFactory: SessionRoundFactory,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async execute(sessionId: string, dto: CreateSessionRoundDto) {
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    if (session.status === MatchSessionStatus.FINALIZADA) {
      throw new ConflictError('La jornada ya está finalizada');
    }

    if (dto.homeSessionTeamId === dto.awaySessionTeamId) {
      throw new ValidationError('Los equipos deben ser distintos');
    }

    const homeTeam = session.teams.find(
      (team) => team.id === dto.homeSessionTeamId,
    );
    const awayTeam = session.teams.find(
      (team) => team.id === dto.awaySessionTeamId,
    );

    if (!homeTeam || !awayTeam) {
      throw new ValidationError(
        'Los equipos indicados no pertenecen a esta jornada',
      );
    }

    const matches = await this.matchRepository.findAllBySessionId(sessionId);
    const hasActiveRound = matches.some(
      (match) => match.status === MatchStatus.EN_CURSO,
    );

    if (hasActiveRound) {
      throw new ConflictError('Ya hay una ronda en curso en esta jornada');
    }

    const match = await this.sessionRoundFactory.createRound(
      session,
      homeTeam,
      awayTeam,
      dto.durationMinutes ?? null,
      dto.goalLimit ?? null,
    );

    if (session.rotationMode === SessionRotationMode.WINNER_STAYS) {
      await this.matchSessionRepository.updateTeamQueuePosition(
        homeTeam.id,
        null,
      );
      await this.matchSessionRepository.updateTeamQueuePosition(
        awayTeam.id,
        null,
      );
    }

    this.sessionEventsService.emit(sessionId);

    return match;
  }
}
